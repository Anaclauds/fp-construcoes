<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import { useDetalheEstoque } from '../../composables/useDetalheEstoque'
import { useFormularioAjusteEstoque, OPCOES_TIPO_AJUSTE } from '../../composables/useFormularioAjusteEstoque'
import { ajustarEstoque } from '../../services/estoque.service'
import type { ItemEstoque } from '../../types/estoque'
import { LIMITE_JUSTIFICATIVA, mascararQuantidade, normalizarQuantidade } from '../../utils/estoque'
import { focarPrimeiroErro } from '../../utils/foco'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import EstoqueResumoSaldo from './EstoqueResumoSaldo.vue'

const props = defineProps<{ item: ItemEstoque }>()

const emit = defineEmits<{
  fechar: []
  /** Ajuste gravado; quem usa mostra "Ajuste Realizado!" e recarrega a lista. */
  ajustado: []
}>()

const { detalhe, carregando, erro, carregar, atualizar } = useDetalheEstoque(props.item.id)

const disponivel = computed(() => (detalhe.value ? Number(detalhe.value.saldo.quantidadeDisponivel) : null))
const unidade = computed(() => detalhe.value?.unidadeMedida ?? props.item.unidadeMedida)
const atual = computed(() => (detalhe.value ? Number(detalhe.value.saldo.quantidadeAtual) : null))
const form = useFormularioAjusteEstoque(disponivel, unidade, atual)

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

/** X, Esc, clique fora e Cancelar: com algo preenchido pergunta antes de descartar. */
function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (!detalhe.value) return
  if (!form.validar()) {
    await nextTick()
    focarPrimeiroErro(raiz.value)
    return
  }

  salvando.value = true
  try {
    await ajustarEstoque(props.item.id, form.paraPayload())
    emit('ajustado')
  } catch (e) {
    const saldoMudou = form.tratarErroApi(e)
    // Saldo alterado por outra tela (compra, reserva...): atualiza o resumo e o máximo sem limpar o que foi digitado.
    if (saldoMudou) await atualizar()
    await nextTick()
    focarPrimeiroErro(raiz.value)
  } finally {
    salvando.value = false
  }
}

const tipoSelecionado = computed({
  get: () => form.campos.tipo,
  set: (valor: string) => {
    form.campos.tipo = valor as typeof form.campos.tipo
  },
})
</script>

<template>
  <ModalBase
    aberto
    titulo="Ajustar Estoque"
    icone="lapis"
    largura="600px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <p
      v-if="carregando"
      class="mensagem"
      role="status"
    >
      Carregando...
    </p>
    <div
      v-else-if="erro || !detalhe"
      class="mensagem mensagem--erro"
      role="alert"
    >
      {{ erro ?? 'Não foi possível carregar o estoque deste material.' }}
      <button
        type="button"
        class="tentar"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <form
      v-else
      :id="idFormulario"
      ref="raiz"
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <EstoqueResumoSaldo
        titulo="Estoque Atual"
        :nome="detalhe.nome"
        :categoria="detalhe.categoria"
        :unidade="detalhe.unidadeMedida"
        :saldo="detalhe.saldo"
      />

      <CampoFormulario
        v-model="tipoSelecionado"
        rotulo="Tipo de Ajuste:"
        tipo="select"
        obrigatorio
        placeholder="Selecione o tipo de ajuste"
        :opcoes="OPCOES_TIPO_AJUSTE"
        :erro="form.erros.tipo"
      />
      <CampoFormulario
        v-model="form.campos.quantidade"
        :rotulo="form.rotuloQuantidade.value"
        obrigatorio
        placeholder="Ex: 5"
        inputmode="decimal"
        autocomplete="off"
        :mascara="mascararQuantidade"
        :normalizar="normalizarQuantidade"
        :aviso="form.dicaMaximo.value"
        :erro="form.erros.quantidade"
      />
      <CampoFormulario
        v-model="form.campos.justificativa"
        rotulo="Justificativa:"
        tipo="area"
        obrigatorio
        placeholder="Descreva o motivo do ajuste..."
        :linhas="3"
        :maxlength="LIMITE_JUSTIFICATIVA"
        :erro="form.erros.justificativa"
      />

      <p
        v-if="form.erroGeral.value"
        class="erro-geral"
        role="alert"
      >
        {{ form.erroGeral.value }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
        :desabilitado="!detalhe"
      >
        Confirmar Ajuste
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar ajuste?"
    mensagem="Os dados preenchidos neste ajuste serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.formulario {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mensagem {
  margin: 0;
  padding: 24px 0;
  color: #6a7282;
  font-size: 14px;
  text-align: center;
}

.mensagem--erro {
  color: var(--fp-vermelho-escuro);
}

.tentar {
  display: block;
  margin: 8px auto 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}
</style>
