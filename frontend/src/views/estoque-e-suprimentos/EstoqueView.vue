<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import EstoqueBotaoAjustar from '../../components/estoque/EstoqueBotaoAjustar.vue'
import EstoqueIndicadores from '../../components/estoque/EstoqueIndicadores.vue'
import EstoqueModalAjustar from '../../components/estoque/EstoqueModalAjustar.vue'
import EstoqueModalNovoMaterial from '../../components/estoque/EstoqueModalNovoMaterial.vue'
import EstoqueModalVisualizar from '../../components/estoque/EstoqueModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaEstoque } from '../../composables/useListaEstoque'
import { useToast } from '../../composables/useToast'
import type { ItemEstoque } from '../../types/estoque'
import { quantidadeComUnidade } from '../../utils/estoque'
import { CATEGORIAS_MATERIAL, rotuloUnidade } from '../../utils/materiais'

type Modal = { tipo: 'visualizar' | 'ajustar'; item: ItemEstoque } | { tipo: 'novo' } | null

const { temPermissao } = useAuth()
const { mostrarToast } = useToast()
// A rota só abre para quem visualiza; ajustar e cadastrar exigem gerenciar.
const podeGerenciar = computed(() => temPermissao('ESTOQUE', 'gerenciar'))

const { busca, categoria, pagina, porPagina, itens, indicadores, total, carregando, erro, carregar } = useListaEstoque()

const opcoesCategoria: OpcaoFiltro[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  ...CATEGORIAS_MATERIAL.map((nome) => ({ valor: nome, rotulo: nome })),
]

const colunas: ColunaTabela[] = [
  { chave: 'material', rotulo: 'Material', largura: '23%' },
  { chave: 'categoria', rotulo: 'Categoria', largura: '14%' },
  { chave: 'atual', rotulo: 'Estoque Atual', largura: '17%' },
  { chave: 'reservado', rotulo: 'Reservado', largura: '17%' },
  { chave: 'disponivel', rotulo: 'Disponível', largura: '17%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '12%' },
]

const modal = shallowRef<Modal>(null)

function fecharModal() {
  modal.value = null
}

function abrir(tipo: 'visualizar' | 'ajustar', item: ItemEstoque) {
  modal.value = { tipo, item }
}

async function aoAjustar() {
  fecharModal()
  mostrarToast('Ajuste Realizado!')
  await carregar()
}

async function aoCriarMaterial() {
  fecharModal()
  mostrarToast('Salvo com sucesso!')
  await carregar()
}

/** "2 projeto(s)" na célula Reservado; sem reserva não mostra nada (como no Figma). */
function projetos(item: ItemEstoque): string {
  return item.projetosComReserva > 0 ? `${item.projetosComReserva} projeto(s)` : ''
}

const semSaldo = (item: ItemEstoque) => Number(item.quantidadeDisponivel) <= 0

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Gerenciar Estoque"
      subtitulo="Controle os materiais da empresa utilizados em projetos"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="modal = { tipo: 'novo' }"
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

    <EstoqueIndicadores :indicadores="indicadores" />

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="categoria"
      class="busca-lista"
      placeholder="Buscar material..."
      rotulo-filtro="Categoria:"
      :opcoes="opcoesCategoria"
    />

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Estoque de materiais"
      :colunas="colunas"
      :linhas="itens"
      :chave-linha="(item: ItemEstoque) => item.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum material encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-material="{ linha }">
        <span class="fp-celula-nome celula-bloco">{{ linha.nome }}</span>
        <span class="celula-secundaria">{{ rotuloUnidade(linha.unidadeMedida) }}</span>
      </template>
      <template #celula-categoria="{ linha }">
        <span class="celula-principal">{{ linha.categoria }}</span>
      </template>
      <template #celula-atual="{ linha }">
        <span
          class="celula-principal"
          :class="{ 'celula-longa': quantidadeComUnidade(linha.quantidadeAtual, linha.unidadeMedida).length > 12 }"
        >{{ quantidadeComUnidade(linha.quantidadeAtual, linha.unidadeMedida) }}</span>
      </template>
      <template #celula-reservado="{ linha }">
        <span
          class="celula-principal"
          :class="{ 'celula-longa': quantidadeComUnidade(linha.quantidadeReservada, linha.unidadeMedida).length > 12 }"
        >{{ quantidadeComUnidade(linha.quantidadeReservada, linha.unidadeMedida) }}</span>
        <span
          v-if="projetos(linha)"
          class="celula-secundaria"
        >{{ projetos(linha) }}</span>
      </template>
      <template #celula-disponivel="{ linha }">
        <span
          class="celula-principal"
          :class="{
            'celula-sem-saldo': semSaldo(linha),
            'celula-longa': quantidadeComUnidade(linha.quantidadeDisponivel, linha.unidadeMedida).length > 12,
          }"
        >{{ quantidadeComUnidade(linha.quantidadeDisponivel, linha.unidadeMedida) }}</span>
        <span
          v-if="semSaldo(linha)"
          class="celula-secundaria celula-sem-saldo"
        >sem saldo livre</span>
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.nome"
            @click="abrir('visualizar', linha)"
          />
          <EstoqueBotaoAjustar
            v-if="podeGerenciar"
            :alvo="linha.nome"
            @click="abrir('ajustar', linha)"
          />
        </div>
      </template>
    </TabelaDados>

    <EstoqueModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :item="modal.item"
      @fechar="fecharModal"
    />
    <EstoqueModalAjustar
      v-else-if="modal?.tipo === 'ajustar'"
      :key="modal.item.id"
      :item="modal.item"
      @fechar="fecharModal"
      @ajustado="aoAjustar"
    />
    <EstoqueModalNovoMaterial
      v-else-if="modal?.tipo === 'novo'"
      @fechar="fecharModal"
      @criado="aoCriarMaterial"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-bottom: 20px;
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

.celula-bloco {
  display: block;
}

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

.celula-sem-saldo {
  color: var(--fp-vermelho);
}
</style>
