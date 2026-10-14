<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import ClienteModalEditar from '../../components/clientes/ClienteModalEditar.vue'
import ClienteModalStatus from '../../components/clientes/ClienteModalStatus.vue'
import ClienteModalVisualizar from '../../components/clientes/ClienteModalVisualizar.vue'
import SeloTipoCliente from '../../components/clientes/SeloTipoCliente.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaClientes, type FiltroTipoCliente } from '../../composables/useListaClientes'
import { useToast } from '../../composables/useToast'
import type { Cliente } from '../../types'
import { formatarCpfCnpj, formatarTelefone } from '../../utils/formatadores'

type Modal = { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; cliente: Cliente } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('CLIENTES', 'gerenciar'))

const { busca, tipo, status, pagina, porPagina, clientes, total, carregando, erro, carregar } =
  useListaClientes()

// Figma: filtro "Tipo: Todos | PF | PJ". O filtro de status das outras listas fica ao lado.
const opcoesTipo: OpcaoFiltro<FiltroTipoCliente>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'PF', rotulo: 'PF' },
  { valor: 'PJ', rotulo: 'PJ' },
]

const colunas: ColunaTabela[] = [
  { chave: 'tipo', rotulo: 'Tipo', largura: '11%' },
  { chave: 'nome', rotulo: 'Nome / Razão Social', largura: '24%' },
  { chave: 'documento', rotulo: 'CPF / CNPJ', largura: '17%' },
  { chave: 'celular', rotulo: 'Celular', largura: '17%' },
  { chave: 'cidade', rotulo: 'Cidade', largura: '19%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '12%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipoModal: NonNullable<Modal>['tipo'], cliente: Cliente) {
  modal.value = { tipo: tipoModal, cliente }
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

/** PJ mostra a razão social; PF e cadastro rápido, o nome. */
function nomePrincipal(cliente: Cliente): string {
  return cliente.tipo === 'PJ' ? (cliente.razaoSocial ?? cliente.nome) : cliente.nome
}

/** Linha de apoio abaixo do nome: nome fantasia (PJ) ou apelido (PF). */
function nomeSecundario(cliente: Cliente): string {
  return (cliente.tipo === 'PJ' ? cliente.nomeFantasia : cliente.apelido) ?? ''
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Cliente"
      subtitulo="Gerencie os registros de clientes Pessoa Física e Pessoa Jurídica"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'clienteNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Cliente
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="tipo"
      placeholder="Buscar por nome, CPF ou CNPJ..."
      rotulo-filtro="Tipo:"
      :opcoes="opcoesTipo"
    >
      <template #filtros-extra>
        <GrupoChips
          v-model="status"
          rotulo="Status:"
          :opcoes="[
            { valor: 'TODOS', rotulo: 'Todos' },
            { valor: 'ATIVO', rotulo: 'Ativo' },
            { valor: 'INATIVO', rotulo: 'Inativo' },
          ]"
        />
      </template>
    </CardBuscaFiltro>

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Clientes"
      :colunas="colunas"
      :linhas="clientes"
      :chave-linha="(cliente: Cliente) => cliente.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum cliente encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-tipo="{ linha }">
        <SeloTipoCliente :tipo="linha.tipo" />
      </template>
      <template #celula-nome="{ linha }">
        <span class="nome-linha">
          <span class="fp-celula-nome celula-bloco">{{ nomePrincipal(linha) }}</span>
          <SeloStatus
            v-if="linha.status === 'INATIVO'"
            :status="linha.status"
          />
        </span>
        <span
          v-if="nomeSecundario(linha)"
          class="celula-secundaria"
        >{{ nomeSecundario(linha) }}</span>
      </template>
      <template #celula-documento="{ linha }">
        <span class="celula-principal">{{ formatarCpfCnpj(linha.cpfCnpj) || '—' }}</span>
      </template>
      <template #celula-celular="{ linha }">
        <span class="celula-principal">{{ formatarTelefone(linha.telefone) }}</span>
      </template>
      <template #celula-cidade="{ linha }">
        <span class="celula-principal">{{ linha.cidade }}</span>
        <span class="celula-secundaria">{{ linha.estado }}</span>
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="nomePrincipal(linha)"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="nomePrincipal(linha)"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              discreto
              :alvo="nomePrincipal(linha)"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="nomePrincipal(linha)"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <ClienteModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :cliente="modal.cliente"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.cliente)"
    />
    <ClienteModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.cliente.id"
      :cliente="modal.cliente"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <ClienteModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :cliente="modal.cliente"
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

.nome-linha {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* O nome encolhe com reticências; o selo "Inativo" nunca é espremido. */
.nome-linha > :not(.celula-bloco) {
  flex-shrink: 0;
}

.celula-bloco {
  display: block;
}

/* Valor principal (13px #333) e linha de apoio abaixo (11px #999), como no Figma. */
.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}
</style>
