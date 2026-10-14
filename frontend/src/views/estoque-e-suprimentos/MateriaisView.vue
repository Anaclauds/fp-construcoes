<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import MaterialModalEditar from '../../components/materiais/MaterialModalEditar.vue'
import MaterialModalStatus from '../../components/materiais/MaterialModalStatus.vue'
import MaterialModalVisualizar from '../../components/materiais/MaterialModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaMateriais } from '../../composables/useListaMateriais'
import { useToast } from '../../composables/useToast'
import type { Material } from '../../types/material'
import { formatarMoeda } from '../../utils/formatadores'
import { CATEGORIAS_MATERIAL, rotuloUnidade } from '../../utils/materiais'

type Modal = { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; material: Material } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('MATERIAIS', 'gerenciar'))

const { busca, categoria, status, pagina, porPagina, materiais, total, carregando, erro, carregar } = useListaMateriais()

const opcoesCategoria: OpcaoFiltro[] = [
  { valor: 'TODAS', rotulo: 'Todos' },
  ...CATEGORIAS_MATERIAL.map((nome) => ({ valor: nome, rotulo: nome })),
]

const colunas: ColunaTabela[] = [
  { chave: 'codigo', rotulo: 'Código', largura: '11%' },
  { chave: 'nome', rotulo: 'Nome do Material', largura: '26%' },
  { chave: 'categoria', rotulo: 'Categoria', largura: '16%' },
  { chave: 'unidade', rotulo: 'Unidade', largura: '16%' },
  { chave: 'preco', rotulo: 'Preço Ref.', largura: '17%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '14%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipoModal: NonNullable<Modal>['tipo'], material: Material) {
  modal.value = { tipo: tipoModal, material }
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
      titulo="Consultar Material"
      subtitulo="Gerencie os materiais cadastrados no sistema"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'materialNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Material
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="categoria"
      class="busca-lista"
      placeholder="Buscar por nome, código ou categoria..."
      rotulo-filtro="Categoria:"
      :opcoes="opcoesCategoria"
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
      rotulo="Materiais"
      :colunas="colunas"
      :linhas="materiais"
      :chave-linha="(material: Material) => material.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum material encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-codigo="{ linha }">
        <span class="celula-principal">{{ linha.codigo }}</span>
      </template>
      <template #celula-nome="{ linha }">
        <span class="nome-linha">
          <span class="fp-celula-nome celula-bloco">{{ linha.nome }}</span>
          <SeloStatus
            v-if="linha.status === 'INATIVO'"
            :status="linha.status"
          />
        </span>
        <span
          v-if="linha.descricao"
          class="celula-secundaria"
        >{{ linha.descricao }}</span>
      </template>
      <template #celula-categoria="{ linha }">
        <span class="celula-principal">{{ linha.categoria }}</span>
      </template>
      <template #celula-unidade="{ linha }">
        <span class="celula-principal">{{ rotuloUnidade(linha.unidadeMedida) }}</span>
      </template>
      <template #celula-preco="{ linha }">
        <span
          class="celula-principal"
          :class="{ 'celula-longa': formatarMoeda(linha.precoReferencia).length > 14 }"
        >{{ formatarMoeda(linha.precoReferencia) }}</span>
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.nome"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="linha.nome"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              discreto
              :alvo="linha.nome"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.nome"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <MaterialModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :material="modal.material"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.material)"
    />
    <MaterialModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.material.id"
      :material="modal.material"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <MaterialModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :material="modal.material"
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
  /* Espaços um pouco menores que nas outras consultas: com os chips de categoria o cartão de filtros ocupa duas linhas e a tabela precisa dos 8 registros. */
  gap: 20px;
  padding-bottom: 14px;
}

.pagina > :first-child {
  margin-bottom: 4px;
}

/* Com várias opções a linha de filtros não cabe ao lado da busca (telas menores): os grupos descem juntos. */
.busca-lista {
  flex-wrap: wrap;
}

.busca-lista :deep(.card-busca-campo) {
  flex: 1 1 280px;
}

.busca-lista :deep(.card-busca-filtros) {
  flex: 0 1 auto;
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

/* Valor principal (13px #333) e descrição abaixo (11px #999), como no Figma. */
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
