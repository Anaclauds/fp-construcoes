<script setup lang="ts">
import { computed, reactive, shallowRef, useId } from 'vue'
import AcessosPermitidos from '../ui/AcessosPermitidos.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import { useAuth } from '../../composables/useAuth'
import { errosPorCampo, extrairMensagemErro } from '../../services/api'
import { atualizarUsuario } from '../../services/usuarios.service'
import type { Usuario, UsuarioAtualizacao } from '../../types'
import { formatarCpf, rotuloLegivel } from '../../utils/formatadores'
import { mapaDePermissoes, permissoesParaPayload, type MapaPermissoes } from '../../utils/permissoes'
import { validarSenhas, type ErrosSenha } from '../../utils/validacao'

const props = defineProps<{ usuario: Usuario }>()

const emit = defineEmits<{
  fechar: []
  salvo: []
}>()

const { usuario: logado } = useAuth()
const idFormulario = useId()

const senha = shallowRef('')
const confirmarSenha = shallowRef('')
const permissoes = shallowRef<MapaPermissoes>(mapaDePermissoes(props.usuario.permissoes))
const erros = reactive<ErrosSenha>({})
const erroApi = shallowRef<string | null>(null)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)
const confirmandoPerdaDeAcesso = shallowRef(false)

const assinaturaPermissoes = (mapa: MapaPermissoes) =>
  JSON.stringify(permissoesParaPayload(mapa).sort((a, b) => a.modulo.localeCompare(b.modulo)))
const permissoesOriginais = assinaturaPermissoes(mapaDePermissoes(props.usuario.permissoes))

// Nova senha digitada ou permissões diferentes das salvas.
const alterado = computed(
  () =>
    senha.value !== '' ||
    confirmarSenha.value !== '' ||
    assinaturaPermissoes(permissoes.value) !== permissoesOriginais,
)

// Editar a própria conta tirando o "gerenciar" de Gestão de Usuários: depois de salvar, a pessoa perde esta tela.
const removendoPropriaGestao = computed(
  () =>
    logado.value?.sub === props.usuario.id &&
    props.usuario.permissoes.some((p) => p.modulo === 'GESTAO_USUARIOS' && p.podeGerenciar) &&
    !permissoes.value.GESTAO_USUARIOS?.podeGerenciar,
)

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

const opcoesFuncionario = computed(() => [
  { valor: String(props.usuario.funcionarioId), rotulo: props.usuario.funcionario.nomeCompleto },
])
// Nova senha é opcional; ao preenchê-la, a confirmação passa a ser obrigatória.
const senhaPreenchida = computed(() => senha.value !== '' || confirmarSenha.value !== '')

/** Valida e, se for remover a própria gestão de usuários, pede confirmação antes de enviar. */
function salvar() {
  if (salvando.value) return
  erroApi.value = null
  const validacao = validarSenhas(senha.value, confirmarSenha.value, false)
  erros.senha = validacao.senha
  erros.confirmarSenha = validacao.confirmarSenha
  if (validacao.senha || validacao.confirmarSenha) return

  if (removendoPropriaGestao.value) confirmandoPerdaDeAcesso.value = true
  else void enviar()
}

async function enviar() {
  if (salvando.value) return
  confirmandoPerdaDeAcesso.value = false

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
    const porCampo = errosPorCampo(erro)
    erros.senha = porCampo.senha
    erros.confirmarSenha = porCampo.confirmarSenha
    // Sem campo conhecido, a mensagem vai para o aviso geral do formulário.
    if (!porCampo.senha && !porCampo.confirmarSenha) erroApi.value = extrairMensagemErro(erro)
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
    @fechar="pedirFechar"
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
        :model-value="rotuloLegivel(usuario.funcionario.funcao)"
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
        v-if="removendoPropriaGestao"
        class="aviso-acesso largura-total"
        role="status"
      >
        Você está removendo o seu próprio acesso de gerenciamento em Gestão de Usuários. Depois de salvar, você
        não poderá mais gerenciar usuários.
      </p>

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
        @click="pedirFechar"
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

  <ModalConfirmacao
    :aberto="confirmandoPerdaDeAcesso"
    titulo="Remover o seu acesso?"
    titulo-aviso="Esta é a sua conta"
    texto-confirmar="Sim, remover meu acesso"
    :carregando="salvando"
    @confirmar="enviar"
    @fechar="confirmandoPerdaDeAcesso = false"
  >
    Você perderá a permissão de gerenciar <strong>Gestão de Usuários</strong> e não poderá desfazer isso sozinho:
    outro administrador precisará devolvê-la.
  </ModalConfirmacao>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    mensagem="As alterações feitas neste usuário serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
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

.aviso-acesso {
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  background: #fef2f2;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
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
