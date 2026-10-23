<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UsuarioModalEditar from '../../components/usuarios/UsuarioModalEditar.vue'
import UsuarioModalStatus from '../../components/usuarios/UsuarioModalStatus.vue'
import UsuarioModalVisualizar from '../../components/usuarios/UsuarioModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro from '../../components/ui/CardBuscaFiltro.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaUsuarios } from '../../composables/useListaUsuarios'
import { useToast } from '../../composables/useToast'
import type { Usuario } from '../../types'
import { formatarCpf, rotuloLegivel } from '../../utils/formatadores'
import { funcionarioInativo, statusDoUsuario } from '../../utils/usuarios'

type Modal =
  | { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; usuario: Usuario }
  | null

const router = useRouter()
const route = useRoute()
const { usuario: logado, temPermissao, carregarUsuario, logout } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('GESTAO_USUARIOS', 'gerenciar'))

const { busca, status, carregando, erro, carregar, pagina, porPagina, total, usuarios } =
  useListaUsuarios()

const colunas: ColunaTabela[] = [
  { chave: 'nome', rotulo: 'Nome', largura: '28%' },
  { chave: 'funcao', rotulo: 'Função', largura: '22%' },
  { chave: 'login', rotulo: 'Login (CPF)', largura: '20%' },
  { chave: 'status', rotulo: 'Status', largura: '14%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '16%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipo: NonNullable<Modal>['tipo'], usuario: Usuario) {
  modal.value = { tipo, usuario }
}

function fecharModal() {
  modal.value = null
}

const ehUsuarioLogado = (alvo: Usuario) => alvo.id === logado.value?.sub

/** Depois de editar a si mesmo, as permissões em memória estão velhas: recarrega e sai da tela se perdeu o acesso. */
async function atualizarPermissoesPropria() {
  try {
    await carregarUsuario()
  } catch {
    return // sem rede: segue com os dados em cache; o guard tenta de novo na próxima navegação
  }
  const exigida = route.meta.permissao
  if (exigida && !temPermissao(exigida.modulo, exigida.acao)) {
    mostrarToast('Você não tem permissão para acessar esta tela.', 'erro')
    await router.replace({ name: 'home' })
  }
}

async function aoSalvar() {
  const alvo = modal.value?.usuario
  fecharModal()
  mostrarToast('Usuário atualizado!')
  if (alvo && ehUsuarioLogado(alvo)) await atualizarPermissoesPropria()
  if (route.name === 'usuarios') await carregar()
}

async function aoAlterarStatus(acao: 'desativar' | 'reativar') {
  const alvo = modal.value?.usuario
  fecharModal()
  // Desativou a própria conta: o token deixa de valer, então encerra a sessão agora.
  if (acao === 'desativar' && alvo && ehUsuarioLogado(alvo)) {
    logout()
    await router.replace({ name: 'login' })
    mostrarToast('Sua conta foi desativada. Você foi desconectado.', 'info')
    return
  }
  mostrarToast(acao === 'desativar' ? 'Usuário desativado!' : 'Usuário reativado!')
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Usuário"
      subtitulo="Gerencie os usuários com acesso ao sistema"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'usuarioNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Usuário
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="status"
      placeholder="Buscar por nome, função ou CPF..."
    />

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Usuários"
      :colunas="colunas"
      :linhas="usuarios"
      :chave-linha="(usuario: Usuario) => usuario.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum usuário encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-nome="{ linha }">
        <span class="fp-celula-nome">{{ linha.funcionario.nomeCompleto }}</span>
      </template>
      <template #celula-funcao="{ linha }">
        {{ rotuloLegivel(linha.funcionario.funcao) }}
      </template>
      <template #celula-login="{ linha }">
        {{ formatarCpf(linha.login) }}
      </template>
      <template #celula-status="{ linha }">
        <SeloStatus
          :status="statusDoUsuario(linha)"
          :title="funcionarioInativo(linha) ? 'Funcionário inativo' : undefined"
        />
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.funcionario.nomeCompleto"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="linha.funcionario.nomeCompleto"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              :alvo="linha.funcionario.nomeCompleto"
              :disabled="funcionarioInativo(linha)"
              :title="funcionarioInativo(linha) ? 'O acesso já está bloqueado: o funcionário está inativo' : undefined"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.funcionario.nomeCompleto"
              :disabled="funcionarioInativo(linha)"
              :title="funcionarioInativo(linha) ? 'Reative o funcionário primeiro' : undefined"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <UsuarioModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :usuario="modal.usuario"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.usuario)"
    />
    <UsuarioModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.usuario.id"
      :usuario="modal.usuario"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <UsuarioModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :usuario="modal.usuario"
      :acao="modal.tipo"
      @fechar="fecharModal"
      @concluido="aoAlterarStatus"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 28px;
  /* Figma: o título ganha respiro até o card de busca e a tabela termina ~60px acima da borda. */
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

.acoes {
  display: flex;
  gap: 6px;
}
</style>
