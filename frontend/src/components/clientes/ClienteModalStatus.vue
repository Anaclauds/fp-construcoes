<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'
import { extrairMensagemErro } from '../../services/api'
import { desativarCliente, reativarCliente } from '../../services/clientes.service'
import type { Cliente } from '../../types'

const props = defineProps<{
  cliente: Cliente
  acao: 'desativar' | 'reativar'
}>()

const emit = defineEmits<{
  fechar: []
  /** A API já foi chamada com sucesso; quem usa mostra o toast e recarrega a lista. */
  concluido: [acao: 'desativar' | 'reativar']
}>()

const processando = shallowRef(false)
const erro = shallowRef<string | null>(null)
const desativando = computed(() => props.acao === 'desativar')

async function confirmar() {
  if (processando.value) return
  processando.value = true
  erro.value = null
  try {
    if (desativando.value) await desativarCliente(props.cliente.id)
    else await reativarCliente(props.cliente.id)
    emit('concluido', props.acao)
  } catch (e) {
    erro.value = extrairMensagemErro(e)
  } finally {
    processando.value = false
  }
}
</script>

<template>
  <ModalConfirmacao
    aberto
    :titulo="desativando ? 'Desativar Cliente' : 'Reativar Cliente'"
    titulo-aviso="Atenção"
    :variante="desativando ? 'perigo' : 'sucesso'"
    :texto-confirmar="desativando ? 'Confirmar Desativação' : 'Sim, continuar'"
    :texto-cancelar="desativando ? 'Cancelar' : 'Não'"
    :carregando="processando"
    :erro="erro"
    @confirmar="confirmar"
    @fechar="emit('fechar')"
  >
    <template v-if="desativando">
      O cliente <strong>{{ cliente.nome }}</strong> será marcado como inativo e não poderá ser
      escolhido em novos orçamentos. O registro é mantido e pode ser reativado a qualquer momento.
    </template>
    <template v-else>
      O cliente <strong>{{ cliente.nome }}</strong> será marcado como ativo e poderá voltar a ser
      escolhido em novos orçamentos.
    </template>
  </ModalConfirmacao>
</template>
