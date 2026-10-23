<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioDespesa } from '../../composables/useFormularioDespesa'
import { useOpcoesCompraDespesa } from '../../composables/useOpcoesCompraDespesa'
import { useToast } from '../../composables/useToast'
import { atualizarDespesa, criarDespesa } from '../../services/despesas.service'
import type { Despesa } from '../../types/despesa'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import DespesaFormulario from './DespesaFormulario.vue'

/** Cadastro (sem `despesa`) e edição (com `despesa`) de despesa; monte com `v-if`. */
const props = defineProps<{ despesa?: Despesa }>()

const emit = defineEmits<{
  fechar: []
  salvo: [despesa: Despesa, edicao: boolean]
}>()

const idFormulario = useId()
const formulario = useTemplateRef('formulario')
const opcoes = useOpcoesCompraDespesa()
const form = useFormularioDespesa(props.despesa, opcoes.saldoAtual)
const { mostrarToast } = useToast()
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

const edicao = computed(() => props.despesa !== undefined)
const largura = computed(() => (form.compra.value ? '780px' : '600px'))
// Sem acesso a fornecedores/materiais a compra não pode ser montada; e caixa fechado não aceita edição.
const semComoSalvar = computed(() => (form.compra.value && opcoes.semAcesso.value) || form.caixaFechado.value)

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (salvando.value || semComoSalvar.value) return
  // O limite do estoque precisa do saldo de cada material: espera as consultas em andamento antes de validar.
  if (form.compra.value) await opcoes.carregarSaldos(form.itens.value.map((l) => l.materialId))
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  // Nada mudou: não há o que enviar.
  if (edicao.value && !form.alterado.value) {
    mostrarToast('Nenhuma alteração para salvar.', 'info')
    emit('fechar')
    return
  }

  salvando.value = true
  try {
    const salva =
      edicao.value && props.despesa
        ? await atualizarDespesa(props.despesa.id, form.paraAtualizacao())
        : await criarDespesa(form.paraPayload())
    emit('salvo', salva, edicao.value)
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    :titulo="edicao ? 'Editar Despesa' : 'Registrar Nova Despesa'"
    :icone="edicao ? 'lapis' : 'mais'"
    :largura="largura"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <DespesaFormulario
        ref="formulario"
        :form="form"
        :opcoes="opcoes"
        :despesa="despesa"
      />
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
        :desabilitado="semComoSalvar"
      >
        {{ edicao ? 'Salvar Alterações' : 'Salvar Despesa' }}
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    :titulo="edicao ? 'Descartar alterações?' : 'Descartar cadastro?'"
    :mensagem="edicao ? 'As alterações feitas nesta despesa serão perdidas.' : 'Os dados preenchidos serão perdidos.'"
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
