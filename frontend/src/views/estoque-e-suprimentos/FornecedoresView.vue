<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import FornecedorModalEditar from '../../components/fornecedores/FornecedorModalEditar.vue'
import FornecedorModalStatus from '../../components/fornecedores/FornecedorModalStatus.vue'
import FornecedorModalVisualizar from '../../components/fornecedores/FornecedorModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro from '../../components/ui/CardBuscaFiltro.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaFornecedores } from '../../composables/useListaFornecedores'
import { useToast } from '../../composables/useToast'
import type { Fornecedor } from '../../types/fornecedor'
import { formatarCnpj, formatarTelefone } from '../../utils/formatadores'

type Modal = { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; fornecedor: Fornecedor } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('FORNECEDORES', 'gerenciar'))

const { busca, status, pagina, porPagina, fornecedores, total, carregando, erro, carregar } = useListaFornecedores()

const colunas: ColunaTabela[] = [
  { chave: 'razaoSocial', rotulo: 'Razão Social', largura: '27%' },
  { chave: 'cnpj', rotulo: 'CNPJ', largura: '20%' },
  { chave: 'contato', rotulo: 'Contato', largura: '17%' },
  { chave: 'cidade', rotulo: 'Cidade', largura: '20%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '16%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipoModal: NonNullable<Modal>['tipo'], fornecedor: Fornecedor) {
  modal.value = { tipo: tipoModal, fornecedor }
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
      titulo="Consultar Fornecedor"
      subtitulo="Gerencie os fornecedores cadastrados no sistema"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'fornecedorNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Fornecedor
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="status"
      placeholder="Buscar por razão social, CNPJ, contato ou cidade..."
    />

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Fornecedores"
      :colunas="colunas"
      :linhas="fornecedores"
      :chave-linha="(fornecedor: Fornecedor) => fornecedor.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum fornecedor encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-razaoSocial="{ linha }">
        <span class="nome-linha">
          <span class="fp-celula-nome celula-bloco">{{ linha.razaoSocial }}</span>
          <SeloStatus
            v-if="linha.status === 'INATIVO'"
            :status="linha.status"
          />
        </span>
        <span class="celula-secundaria">{{ linha.nomeFantasia }}</span>
      </template>
      <template #celula-cnpj="{ linha }">
        <span class="celula-principal">{{ formatarCnpj(linha.cnpj) }}</span>
      </template>
      <template #celula-contato="{ linha }">
        <span class="celula-principal">{{ formatarTelefone(linha.contato) }}</span>
      </template>
      <template #celula-cidade="{ linha }">
        <span class="celula-principal">{{ linha.cidade }}</span>
        <span class="celula-secundaria">{{ linha.estado }}</span>
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.nomeFantasia"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="linha.nomeFantasia"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              discreto
              :alvo="linha.nomeFantasia"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.nomeFantasia"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <FornecedorModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :fornecedor="modal.fornecedor"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.fornecedor)"
    />
    <FornecedorModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.fornecedor.id"
      :fornecedor="modal.fornecedor"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <FornecedorModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :fornecedor="modal.fornecedor"
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
  /* Mesma estrutura das demais consultas: respiro do título e folga na base. */
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
