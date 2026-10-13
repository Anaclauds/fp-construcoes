<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'
import { extrairMensagemErro } from '../../services/api'
import { desativarFuncionario, reativarFuncionario } from '../../services/funcionarios.service'
import type { Funcionario } from '../../types'

const props = defineProps<{
  funcionario: Funcionario
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
    if (desativando.value) await desativarFuncionario(props.funcionario.id)
    else await reativarFuncionario(props.funcionario.id)
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
    :titulo="desativando ? 'Desativar Funcionário' : 'Ativar Funcionário'"
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
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como inativo e não
      poderá acessar o sistema.
    </template>
    <template v-else>
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como ativo e poderá
      acessar o sistema novamente.
    </template>
  </ModalConfirmacao>
</template>
