<script setup lang="ts">
import { computed, reactive, shallowRef, useId } from 'vue'
import AcessosPermitidos from '../ui/AcessosPermitidos.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import { extrairMensagemErro } from '../../services/api'
import { atualizarUsuario } from '../../services/usuarios.service'
import type { Usuario, UsuarioAtualizacao } from '../../types'
import { formatarCpf } from '../../utils/formatadores'
import { mapaDePermissoes, permissoesParaPayload, type MapaPermissoes } from '../../utils/permissoes'
import { validarSenhas, type ErrosSenha } from '../../utils/validacao'

const props = defineProps<{ usuario: Usuario }>()

const emit = defineEmits<{
  fechar: []
  salvo: []
}>()

const idFormulario = useId()

const senha = shallowRef('')
const confirmarSenha = shallowRef('')
const permissoes = shallowRef<MapaPermissoes>(mapaDePermissoes(props.usuario.permissoes))
const erros = reactive<ErrosSenha>({})
const erroApi = shallowRef<string | null>(null)
const salvando = shallowRef(false)

const opcoesFuncionario = computed(() => [
  { valor: String(props.usuario.funcionarioId), rotulo: props.usuario.funcionario.nomeCompleto },
])
// Nova senha é opcional; ao preenchê-la, a confirmação passa a ser obrigatória.
const senhaPreenchida = computed(() => senha.value !== '' || confirmarSenha.value !== '')

async function salvar() {
  erroApi.value = null
  const validacao = validarSenhas(senha.value, confirmarSenha.value, false)
  erros.senha = validacao.senha
  erros.confirmarSenha = validacao.confirmarSenha
  if (validacao.senha || validacao.confirmarSenha) return

  const payload: UsuarioAtualizacao = { permissoes: permissoesParaPayload(permissoes.value) }
  if (senhaPreenchida.value) {
    payload.senha = senha.value
    payload.confirmarSenha = confirmarSenha.value
  }

  salvando.value = true
  try {
    await atualizarUsuario(props.usuario.id, payload)
    emit('salvo')
  } catch (erro) {
    erroApi.value = extrairMensagemErro(erro)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Editar Usuário"
    icone="lapis"
    largura="699px"
    :bloqueado="salvando"
    @fechar="emit('fechar')"
  >
    <form
      :id="idFormulario"
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <h3 class="secao">
        Dados do Usuário
      </h3>

      <CampoFormulario
        class="largura-total"
        rotulo="Funcionário"
        tipo="select"
        obrigatorio
        desabilitado
        :model-value="String(usuario.funcionarioId)"
        :opcoes="opcoesFuncionario"
      />
      <CampoFormulario
        rotulo="Função"
        somente-leitura
        :model-value="usuario.funcionario.funcao"
      />
      <CampoFormulario
        rotulo="Login"
        dica="(CPF do funcionário)"
        somente-leitura
        :model-value="formatarCpf(usuario.login)"
      />
      <CampoFormulario
        v-model="senha"
        rotulo="Nova Senha"
        tipo="senha"
        placeholder="Deixe em branco para manter"
        autocomplete="new-password"
        :erro="erros.senha"
      />
      <CampoFormulario
        v-model="confirmarSenha"
        rotulo="Confirme a senha"
        tipo="senha"
        placeholder="Digite novamente"
        autocomplete="new-password"
        :obrigatorio="senhaPreenchida"
        :erro="erros.confirmarSenha"
      />

      <AcessosPermitidos
        v-model="permissoes"
        class="largura-total"
        altura="330px"
      />

      <p
        v-if="erroApi"
        class="erro-api largura-total"
        role="alert"
      >
        {{ erroApi }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="salvando"
        @click="emit('fechar')"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
      >
        Salvar Alterações
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.formulario {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 24px;
}

.secao {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.largura-total {
  grid-column: 1 / -1;
}

.erro-api {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 600px) {
  .formulario {
    grid-template-columns: 1fr;
  }
}
</style>
