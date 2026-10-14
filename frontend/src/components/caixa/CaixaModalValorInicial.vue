<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { useAcoesCaixa } from '../../composables/useAcoesCaixa'
import { extrairMensagemErro } from '../../services/api'
import { consultarCaixa } from '../../services/financeiro.service'
import type { Caixa } from '../../types/caixa'
import {
  MES_MINIMO,
  competenciaDoCaixa,
  deslocarCompetencia,
  mensagemCaixa,
  nomeDoMes,
  rotuloCompetencia,
} from '../../utils/caixa'
import { formatarMoeda, mascararMoeda, moedaParaNumero } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'

const props = defineProps<{ caixa: Caixa }>()

const emit = defineEmits<{
  fechar: []
  salvo: [caixa: Caixa]
  /** O caixa já mudou em outra tela (ex.: foi fechado): quem usa recarrega o caixa. */
  desatualizado: []
}>()

/** DECIMAL(12,2). */
const VALOR_MAXIMO = 9_999_999_999.99

const acoes = useAcoesCaixa()
const idFormulario = useId()

const competencia = computed(() => competenciaDoCaixa(props.caixa))
const anterior = computed(() => deslocarCompetencia(competencia.value, -1))
const temAnterior = computed(() => anterior.value >= MES_MINIMO)

const valor = shallowRef(Number(props.caixa.resumo.valorInicial) > 0 ? formatarMoeda(props.caixa.resumo.valorInicial) : '')
const erroCampo = shallowRef<string | undefined>()

// Saldo do mês anterior: só é consultado sob pedido, porque consultar um mês cria o caixa dele.
const consultandoAnterior = shallowRef(false)
const saldoAnterior = shallowRef<{ valor: string; fechado: boolean } | null>(null)
const erroAnterior = shallowRef<string | null>(null)

async function consultarAnterior() {
  consultandoAnterior.value = true
  erroAnterior.value = null
  try {
    const caixaAnterior = await consultarCaixa(anterior.value)
    saldoAnterior.value = { valor: caixaAnterior.resumo.saldoAtual, fechado: caixaAnterior.status === 'FECHADO' }
  } catch (e) {
    erroAnterior.value = mensagemCaixa(extrairMensagemErro(e))
  } finally {
    consultandoAnterior.value = false
  }
}

function usarSaldoAnterior() {
  if (saldoAnterior.value) valor.value = formatarMoeda(Math.max(0, Number(saldoAnterior.value.valor)))
  erroCampo.value = undefined
}

async function salvar() {
  const numero = valor.value === '' ? 0 : moedaParaNumero(valor.value)
  if (numero === null || numero < 0) {
    erroCampo.value = 'Informe um valor válido.'
    return
  }
  if (numero > VALOR_MAXIMO) {
    erroCampo.value = 'Valor acima do limite permitido.'
    return
  }
  const resultado = await acoes.definirValorInicial(competencia.value, numero)
  if (resultado) emit('salvo', resultado)
  else if (acoes.desatualizado.value) emit('desatualizado')
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Valor Inicial do Caixa"
    :subtitulo="rotuloCompetencia(competencia)"
    icone="lapis"
    largura="520px"
    :bloqueado="acoes.executando.value"
    @fechar="emit('fechar')"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <p class="explicacao">
        O valor inicial <strong>não é herdado automaticamente</strong> do saldo do mês anterior: informe com quanto o
        caixa de {{ nomeDoMes(competencia) }} começou. Ele pode ser alterado enquanto o caixa estiver aberto e muda o
        saldo do mês.
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

      <div
        v-if="temAnterior"
        class="anterior"
      >
        <template v-if="saldoAnterior">
          <p>
            Saldo de {{ rotuloCompetencia(anterior) }}: <strong>{{ formatarMoeda(saldoAnterior.valor) }}</strong>
            <span v-if="!saldoAnterior.fechado"> (mês ainda aberto, o saldo pode mudar)</span>
          </p>
          <button
            type="button"
            class="link"
            @click="usarSaldoAnterior"
          >
            Usar este valor
          </button>
        </template>
        <button
          v-else
          type="button"
          class="link"
          :disabled="consultandoAnterior"
          @click="consultarAnterior"
        >
          {{ consultandoAnterior ? 'Consultando...' : `Consultar o saldo de ${rotuloCompetencia(anterior)}` }}
        </button>
        <p
          v-if="erroAnterior"
          class="erro"
          role="alert"
        >
          {{ erroAnterior }}
        </p>
      </div>

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
        Salvar
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

.anterior {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
  margin-top: 12px;
  color: #555;
  font-size: 13px;
}

.anterior p {
  margin: 0;
}

.link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.link:disabled {
  cursor: wait;
  opacity: 0.6;
}

.link:focus-visible {
  outline: none;
  border-radius: 4px;
  box-shadow: var(--fp-foco);
}

.erro {
  margin: 10px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}
</style>
