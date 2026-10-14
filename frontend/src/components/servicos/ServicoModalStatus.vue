<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { extrairErro } from '../../services/api'
import { desativarServico, reativarServico } from '../../services/servicos.service'
import type { Servico } from '../../types/servico'
import { mensagemServico } from '../../utils/servicos'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'

const props = defineProps<{
  servico: Servico
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
  processando.value = true
  erro.value = null
  try {
    if (desativando.value) await desativarServico(props.servico.id)
    else await reativarServico(props.servico.id)
    emit('concluido', props.acao)
  } catch (e) {
    erro.value = mensagemServico(extrairErro(e).mensagem)
  } finally {
    processando.value = false
  }
}
</script>

<template>
  <ModalConfirmacao
    aberto
    :titulo="desativando ? 'Desativar Serviço' : 'Ativar Serviço'"
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
      O serviço <strong>{{ servico.nome }}</strong> será marcado como inativo e não poderá ser
      escolhido em novos orçamentos nem em novas etapas ou extras de projetos. Orçamentos e projetos
      já existentes não são alterados, e o serviço pode ser reativado a qualquer momento.
    </template>
    <template v-else>
      O serviço <strong>{{ servico.nome }}</strong> será marcado como ativo e poderá voltar a ser
      escolhido em novos orçamentos, etapas e extras de projetos.
    </template>
  </ModalConfirmacao>
</template>
