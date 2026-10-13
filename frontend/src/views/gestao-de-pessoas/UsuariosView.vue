<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
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
import { formatarCpf } from '../../utils/formatadores'

type Modal =
  | { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; usuario: Usuario }
  | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('GESTAO_USUARIOS', 'gerenciar'))

const { busca, status, carregando, erro, carregar, pagina, porPagina, total, itensDaPagina } =
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

async function aoSalvar() {
  fecharModal()
  mostrarToast('Salvo com sucesso!')
  await carregar()
}

async function aoAlterarStatus(acao: 'desativar' | 'reativar') {
  fecharModal()
  mostrarToast(acao === 'desativar' ? 'Desativado com sucesso!' : 'Ativado com sucesso!')
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
      placeholder="Buscar por nome, função ou cpf..."
    />

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Usuários"
      :colunas="colunas"
      :linhas="itensDaPagina"
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
        {{ linha.funcionario.funcao }}
      </template>
      <template #celula-login="{ linha }">
        {{ formatarCpf(linha.login) }}
      </template>
      <template #celula-status="{ linha }">
        <SeloStatus :status="linha.status" />
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
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.funcionario.nomeCompleto"
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
