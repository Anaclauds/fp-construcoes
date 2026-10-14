<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'
import { useAuth } from '../../composables/useAuth'
import { extrairMensagemErro } from '../../services/api'
import { desativarUsuario, reativarUsuario } from '../../services/usuarios.service'
import type { Usuario } from '../../types'

const props = defineProps<{
  usuario: Usuario
  acao: 'desativar' | 'reativar'
}>()

const emit = defineEmits<{
  fechar: []
  /** A API já foi chamada com sucesso; quem usa mostra o toast e recarrega a lista. */
  concluido: [acao: 'desativar' | 'reativar']
}>()

const { usuario: logado } = useAuth()

const processando = shallowRef(false)
const erro = shallowRef<string | null>(null)
const desativando = computed(() => props.acao === 'desativar')
// Desativar a própria conta encerra a sessão: o aviso precisa ser mais forte.
const propriaConta = computed(() => desativando.value && logado.value?.sub === props.usuario.id)

async function confirmar() {
  processando.value = true
  erro.value = null
  try {
    if (desativando.value) await desativarUsuario(props.usuario.id)
    else await reativarUsuario(props.usuario.id)
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
    :titulo="desativando ? 'Desativar Usuário' : 'Ativar Usuário'"
    :subtitulo="usuario.funcionario.nomeCompleto"
    :variante="desativando ? 'perigo' : 'sucesso'"
    :titulo-aviso="propriaConta ? 'Esta é a sua conta' : undefined"
    :texto-confirmar="desativando ? 'Confirmar Desativação' : 'Sim, continuar'"
    :texto-cancelar="desativando ? 'Cancelar' : 'Não'"
    :carregando="processando"
    :erro="erro"
    @confirmar="confirmar"
    @fechar="emit('fechar')"
  >
    <template v-if="propriaConta">
      Esta é a sua conta: <strong>você perderá o acesso imediatamente</strong> e será desconectado. Outro
      administrador precisará reativá-la.
    </template>
    <template v-else-if="desativando">
      O usuário <strong>{{ usuario.funcionario.nomeCompleto }}</strong> perderá o acesso ao sistema. O
      registro será mantido e pode ser reativado a qualquer momento.
    </template>
    <template v-else>
      O usuário <strong>{{ usuario.funcionario.nomeCompleto }}</strong> voltará a ter acesso ao sistema
      com as permissões já configuradas.
    </template>
  </ModalConfirmacao>
</template>
