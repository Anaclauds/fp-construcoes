<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import EstoqueBotaoAjustar from '../../components/estoque/EstoqueBotaoAjustar.vue'
import EstoqueIndicadores from '../../components/estoque/EstoqueIndicadores.vue'
import EstoqueModalAjustar from '../../components/estoque/EstoqueModalAjustar.vue'
import EstoqueModalNovoMaterial from '../../components/estoque/EstoqueModalNovoMaterial.vue'
import EstoqueModalVisualizar from '../../components/estoque/EstoqueModalVisualizar.vue'
import MaterialModalEditar from '../../components/materiais/MaterialModalEditar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useCatalogoMaterial } from '../../composables/useCatalogoMaterial'
import { useListaEstoque } from '../../composables/useListaEstoque'
import { useToast } from '../../composables/useToast'
import { extrairMensagemErro } from '../../services/api'
import { buscarMaterial } from '../../services/materiais.service'
import type { ItemEstoque } from '../../types/estoque'
import type { Material } from '../../types/material'
import { quantidadeComUnidade } from '../../utils/estoque'
import { rotuloUnidade } from '../../utils/materiais'

type Modal =
  | { tipo: 'visualizar' | 'ajustar'; item: ItemEstoque }
  | { tipo: 'editar'; material: Material }
  | { tipo: 'novo' }
  | null

const { temPermissao } = useAuth()
const { mostrarToast } = useToast()
// A rota só abre para quem visualiza; ajustar e cadastrar exigem gerenciar.
const podeGerenciar = computed(() => temPermissao('ESTOQUE', 'gerenciar'))
// Editar o cadastro do material (3ª ação da linha no Figma) é uma operação de Materiais: PATCH /materiais/:id exige MATERIAIS gerenciar.
const podeEditarMaterial = computed(() => temPermissao('MATERIAIS', 'gerenciar'))

const { busca, categoria, pagina, porPagina, itens, indicadores, total, carregando, erro, carregar } = useListaEstoque()

// Categorias do catálogo da API (inclui as cadastradas pelos usuários) e as legadas gravadas em materiais ATIVOS:
// o estoque só lista materiais ativos, então categorias que só têm material inativo não entram no filtro.
const catalogo = useCatalogoMaterial({ unidades: false, emUso: 'ATIVO' })
const opcoesCategoria = computed<OpcaoFiltro[]>(() => {
  const lista: OpcaoFiltro[] = [
    { valor: 'TODAS', rotulo: 'Todas' },
    ...catalogo.categoriasFiltro.value.map(({ valor, rotulo }) => ({ valor, rotulo })),
  ]
  // Categoria vinda da URL (ou fora do limite lido): continua selecionada em vez de deixar a lista em branco.
  if (categoria.value !== 'TODAS' && !lista.some((o) => o.valor === categoria.value)) {
    lista.push({ valor: categoria.value, rotulo: categoria.value })
  }
  return lista
})
// Acima do limite de páginas lidas, categorias podem faltar no filtro; a busca por texto continua achando todos os materiais.
const apoioCategoria = computed(() =>
  catalogo.emUsoCompleto.value ? undefined : 'Há muitos materiais: algumas categorias podem não aparecer na lista. Use a busca para encontrá-las.',
)

const filtrado = computed(() => busca.value.trim() !== '' || categoria.value !== 'TODAS')

const colunas: ColunaTabela[] = [
  { chave: 'material', rotulo: 'Material', largura: '21%' },
  { chave: 'categoria', rotulo: 'Categoria', largura: '13%' },
  { chave: 'atual', rotulo: 'Estoque Atual', largura: '16%', numerica: true },
  { chave: 'reservado', rotulo: 'Reservado', largura: '17%', numerica: true },
  { chave: 'disponivel', rotulo: 'Disponível', largura: '17%', numerica: true },
  { chave: 'acoes', rotulo: 'Ações', largura: '16%' },
]

const modal = shallowRef<Modal>(null)

function fecharModal() {
  modal.value = null
}

function abrir(tipo: 'visualizar' | 'ajustar', item: ItemEstoque) {
  modal.value = { tipo, item }
}

/** O modal de edição precisa do cadastro completo (a lista do estoque traz só o saldo): busca em GET /materiais/:id. */
const abrindoEdicao = shallowRef<number | null>(null)

async function abrirEdicao(item: ItemEstoque) {
  if (abrindoEdicao.value !== null) return
  abrindoEdicao.value = item.id
  const modalAoPedir = modal.value
  try {
    const material = await buscarMaterial(item.id)
    // Enquanto o cadastro carregava, outro modal foi aberto ou este foi fechado: a resposta antiga não o sobrepõe.
    if (modal.value === modalAoPedir) modal.value = { tipo: 'editar', material }
  } catch (e) {
    mostrarToast(extrairMensagemErro(e), 'erro')
  } finally {
    abrindoEdicao.value = null
  }
}

async function aoEditarMaterial() {
  fecharModal()
  mostrarToast('Material atualizado!')
  // A edição pode ter criado uma categoria ou mudado a do material: atualiza também o filtro de categorias.
  await Promise.all([carregar(), catalogo.recarregar()])
}

async function aoAjustar() {
  fecharModal()
  mostrarToast('Ajuste realizado!')
  await carregar()
}

async function aoCriarMaterial() {
  fecharModal()
  mostrarToast('Material cadastrado!')
  // Atualiza também o filtro de categorias: o modal pode ter criado uma categoria nova.
  await Promise.all([carregar(), catalogo.recarregar()])
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

    <EstoqueIndicadores
      :indicadores="indicadores"
      :filtrado="filtrado"
    />

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="categoria"
      class="busca-lista"
      placeholder="Buscar material..."
      rotulo-filtro="Categoria:"
      filtro-em-lista
      :apoio-filtro="apoioCategoria"
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
          <BotaoAcao
            v-if="podeEditarMaterial"
            tipo="editar"
            :alvo="linha.nome"
            :disabled="abrindoEdicao !== null"
            @click="abrirEdicao(linha)"
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
    <MaterialModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.material.id"
      :material="modal.material"
      @fechar="fecharModal"
      @salvo="aoEditarMaterial"
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

/* Com 3 ações a célula é estreita: os botões 32x32 do Figma não podem encolher. */
.acoes > :deep(button) {
  flex-shrink: 0;
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
