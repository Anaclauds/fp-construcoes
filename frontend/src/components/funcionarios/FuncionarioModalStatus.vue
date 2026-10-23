<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'
import { useAuth } from '../../composables/useAuth'
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

const { usuario: logado } = useAuth()

const processando = shallowRef(false)
const erro = shallowRef<string | null>(null)
const desativando = computed(() => props.acao === 'desativar')
// Desativar o próprio cadastro derruba a sessão (a API recusa o token de funcionário inativo): aviso mais forte.
const propriaConta = computed(() => desativando.value && logado.value?.funcionarioId === props.funcionario.id)

async function confirmar() {
  if (processando.value) return
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
    :titulo="desativando ? 'Desativar Funcionário' : 'Reativar Funcionário'"
    :titulo-aviso="propriaConta ? 'Este é o seu cadastro' : 'Atenção'"
    :variante="desativando ? 'perigo' : 'sucesso'"
    :texto-confirmar="desativando ? 'Confirmar Desativação' : 'Sim, continuar'"
    :texto-cancelar="desativando ? 'Cancelar' : 'Não'"
    :carregando="processando"
    :erro="erro"
    @confirmar="confirmar"
    @fechar="emit('fechar')"
  >
    <template v-if="propriaConta">
      Este é o seu cadastro: <strong>você perderá o acesso imediatamente</strong> e será desconectado. Outro
      administrador precisará reativá-lo.
    </template>
    <template v-else-if="desativando">
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como inativo<template
        v-if="funcionario.usuario"
      > e não poderá acessar o sistema</template>.
    </template>
    <template v-else-if="!funcionario.usuario">
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como ativo. Ele ainda não tem
      usuário: para acessar o sistema, cadastre um em Usuários.
    </template>
    <template v-else-if="funcionario.usuario.status === 'ATIVO'">
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como ativo e poderá acessar o
      sistema novamente com o usuário já cadastrado.
    </template>
    <template v-else>
      O funcionário <strong>{{ funcionario.nomeCompleto }}</strong> será marcado como ativo, mas o usuário dele
      continua inativo: reative-o em Usuários para devolver o acesso ao sistema.
    </template>
  </ModalConfirmacao>
</template>
