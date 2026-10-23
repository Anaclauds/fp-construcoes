<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { extrairErro, type ErroApi } from '../../services/api'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'

/**
 * Confirmação de desativar/reativar um cadastro (material, equipamento, fornecedor). `executar` chama a API;
 * o texto explicativo vem pelos slots `desativar` e `reativar`.
 */
const props = defineProps<{
  /** "Material", "Equipamento"... usado no título. */
  entidade: string
  acao: 'desativar' | 'reativar'
  executar: () => Promise<unknown>
  /** Converte o erro da API (decidido pelo `codigo`) numa frase para o usuário. */
  mapearErro: (erro: ErroApi) => string
}>()

const emit = defineEmits<{
  fechar: []
  /** A API já respondeu com sucesso; quem usa mostra o toast e recarrega a lista. */
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
    await props.executar()
    emit('concluido', props.acao)
  } catch (e) {
    erro.value = props.mapearErro(extrairErro(e))
  } finally {
    processando.value = false
  }
}
</script>

<template>
  <ModalConfirmacao
    aberto
    :titulo="desativando ? `Desativar ${entidade}` : `Reativar ${entidade}`"
    titulo-aviso="Atenção"
    :variante="desativando ? 'perigo' : 'sucesso'"
    :texto-confirmar="desativando ? 'Confirmar Desativação' : 'Sim, continuar'"
    :texto-cancelar="desativando ? 'Cancelar' : 'Não'"
    :carregando="processando"
    :erro="erro"
    @confirmar="confirmar"
    @fechar="emit('fechar')"
  >
    <slot :name="acao" />
  </ModalConfirmacao>
</template>
