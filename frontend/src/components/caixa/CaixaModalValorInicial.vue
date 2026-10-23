<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useAcoesCaixa } from '../../composables/useAcoesCaixa'
import type { Caixa } from '../../types/caixa'
import { caixaNaoAberto, competenciaDoCaixa, herdaSaldoAnterior, nomeDoMes, rotuloCompetencia } from '../../utils/caixa'
import { formatarMoeda, mascararMoeda, moedaParaNumero } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'

/**
 * Abre a competência (caixa ainda não aberto) ou redefine o valor inicial de um caixa aberto e sem lançamentos.
 * Havendo caixa de mês anterior, o servidor usa o saldo final dele: o valor não é pedido nem aceito.
 */
const props = defineProps<{ caixa: Caixa }>()

const emit = defineEmits<{
  fechar: []
  /** Caixa aberto ou atualizado, como o servidor devolveu. */
  salvo: [caixa: Caixa]
  /** O caixa já mudou em outra tela (ex.: foi fechado ou recebeu lançamentos): quem usa recarrega o caixa. */
  desatualizado: []
}>()

/** DECIMAL(12,2). */
const VALOR_MAXIMO = 9_999_999_999.99

const acoes = useAcoesCaixa()
const idFormulario = useId()

const competencia = computed(() => competenciaDoCaixa(props.caixa))
const abertura = computed(() => caixaNaoAberto(props.caixa))
const herdado = computed(() => herdaSaldoAnterior(props.caixa))

const valor = shallowRef(Number(props.caixa.resumo.valorInicial) > 0 ? formatarMoeda(props.caixa.resumo.valorInicial) : '')
const erroCampo = shallowRef<string | undefined>()

async function salvar() {
  // Com saldo herdado o DTO ainda exige um número: vai 0 e o servidor o substitui pelo saldo do mês anterior.
  let numero = 0
  if (!herdado.value) {
    numero = valor.value === '' ? 0 : (moedaParaNumero(valor.value) ?? Number.NaN)
    if (Number.isNaN(numero) || numero < 0) {
      erroCampo.value = 'Informe um valor válido.'
      return
    }
    if (numero > VALOR_MAXIMO) {
      erroCampo.value = 'Valor acima do limite permitido.'
      return
    }
  }
  const resultado = await acoes.abrir(competencia.value, numero)
  if (resultado) emit('salvo', resultado)
  else if (acoes.desatualizado.value) emit('desatualizado')
}
</script>

<template>
  <ModalBase
    aberto
    :titulo="abertura ? 'Abrir Caixa' : 'Valor Inicial do Caixa'"
    :subtitulo="rotuloCompetencia(competencia)"
    :icone="abertura ? 'mais' : 'lapis'"
    largura="520px"
    :bloqueado="acoes.executando.value"
    @fechar="emit('fechar')"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <p
        v-if="herdado"
        class="explicacao"
      >
        O valor inicial de {{ nomeDoMes(competencia) }} <strong>é o saldo final do mês anterior</strong>, calculado pelo
        sistema: não é preciso informar nem pode ser alterado. O caixa do mês anterior precisa estar fechado para
        abrir este.
      </p>
      <template v-else>
        <p class="explicacao">
          Este é o primeiro caixa do sistema: informe com quanto o caixa de {{ nomeDoMes(competencia) }} começou. Os
          próximos meses herdam o saldo final do mês anterior. O valor pode ser alterado enquanto o caixa estiver
          aberto e sem lançamentos.
        </p>

        <CampoFormulario
          v-model="valor"
          rotulo="Valor inicial (R$):"
          placeholder="0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="(texto: string) => mascararMoeda(texto, 12)"
          :erro="erroCampo"
          @update:model-value="erroCampo = undefined"
        />
      </template>

      <p
        v-if="acoes.erro.value"
        class="erro"
        role="alert"
      >
        {{ acoes.erro.value }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="acoes.executando.value"
        @click="emit('fechar')"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="acoes.executando.value"
      >
        {{ abertura ? 'Abrir Caixa' : 'Salvar' }}
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.explicacao {
  margin: 0 0 14px;
  color: #555;
  font-size: 13.5px;
  line-height: 1.5;
}

.erro {
  margin: 10px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}
</style>
