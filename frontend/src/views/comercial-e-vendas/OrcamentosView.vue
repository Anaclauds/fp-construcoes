<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import OrcamentoImpressao from '../../components/orcamentos/OrcamentoImpressao.vue'
import OrcamentoModalAprovar from '../../components/orcamentos/OrcamentoModalAprovar.vue'
import OrcamentoModalEditar from '../../components/orcamentos/OrcamentoModalEditar.vue'
import OrcamentoModalStatus from '../../components/orcamentos/OrcamentoModalStatus.vue'
import OrcamentoModalVisualizar from '../../components/orcamentos/OrcamentoModalVisualizar.vue'
import SeloStatusOrcamento from '../../components/orcamentos/SeloStatusOrcamento.vue'
import SeloTipoOrcamento from '../../components/orcamentos/SeloTipoOrcamento.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import CardIndicador from '../../components/ui/CardIndicador.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import {
  useListaOrcamentos,
  type FiltroStatusOrcamento,
  type FiltroTipoOrcamento,
} from '../../composables/useListaOrcamentos'
import { useToast } from '../../composables/useToast'
import type { Orcamento, RespostaAprovacao, StatusDefinivel } from '../../types'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import { formatarNumeroOrcamento, orcamentoEditavel } from '../../utils/orcamentos'

type Modal =
  | { tipo: 'visualizar' | 'editar' | 'aprovar'; orcamento: Orcamento }
  | { tipo: 'status'; orcamento: Orcamento; destino: StatusDefinivel }
  | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('ORCAMENTOS', 'gerenciar'))

const { busca, status, tipo, pagina, porPagina, orcamentos, total, indicadores, reprovados, carregando, erro, carregar } =
  useListaOrcamentos()

// Figma: Todos | Pendente | Em Análise | Reprovado. Aprovado e Cancelado entram para achar o que já saiu do fluxo.
const opcoesStatus: OpcaoFiltro<FiltroStatusOrcamento>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'PENDENTE', rotulo: 'Pendente' },
  { valor: 'EM_ANALISE', rotulo: 'Em Análise' },
  { valor: 'APROVADO', rotulo: 'Aprovado' },
  { valor: 'REPROVADO', rotulo: 'Reprovado' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
]

const opcoesTipo: OpcaoFiltro<FiltroTipoOrcamento>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'SERRALHERIA', rotulo: 'Serralheria' },
  { valor: 'CALHAS', rotulo: 'Calhas' },
  { valor: 'CONSTRUCAO_CIVIL', rotulo: 'Construção Civil' },
]

const colunas: ColunaTabela[] = [
  { chave: 'numero', rotulo: 'Nº', largura: '8%' },
  { chave: 'titulo', rotulo: 'Título / Tipo', largura: '22%' },
  { chave: 'cliente', rotulo: 'Cliente', largura: '19%' },
  { chave: 'cidade', rotulo: 'Cidade', largura: '12%' },
  { chave: 'valor', rotulo: 'Valor Total', largura: '11%' },
  { chave: 'status', rotulo: 'Status', largura: '14%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '146px' },
]

const modal = shallowRef<Modal>(null)
const imprimindo = shallowRef<Orcamento | null>(null)

function abrir(tipoModal: 'visualizar' | 'editar' | 'aprovar', orcamento: Orcamento) {
  modal.value = { tipo: tipoModal, orcamento }
}

function abrirStatus(orcamento: Orcamento, destino: StatusDefinivel) {
  modal.value = { tipo: 'status', orcamento, destino }
}

function fecharModal() {
  modal.value = null
}

/** Desistiu de mudar o status: volta aos detalhes do orçamento de onde a ação partiu. */
function cancelarStatus() {
  if (modal.value?.tipo === 'status') abrir('visualizar', modal.value.orcamento)
}

async function aoSalvar() {
  fecharModal()
  mostrarToast('Salvo com sucesso!')
  await carregar()
}

async function aoAprovar(resposta: RespostaAprovacao) {
  fecharModal()
  // Falta de estoque etc. (backend atualizado): não bloqueia a aprovação, mas precisa ser lida antes de iniciar o projeto.
  // Um único aviso (com os detalhes dentro) em vez de dois empilhados sobre a tabela.
  const avisos = resposta.avisos ?? []
  mostrarToast('Orçamento aprovado e convertido em projeto!', avisos.length > 0 ? 'info' : 'sucesso', avisos.length > 0 ? 12000 : undefined, avisos)
  await carregar()
}

async function aoAlterarStatus() {
  fecharModal()
  mostrarToast('Status atualizado com sucesso!')
  await carregar()
}

/** O navegador não informa se o usuário salvou ou cancelou: o aviso é neutro (como no Relatório de Frequência). */
function aoConcluirPdf() {
  imprimindo.value = null
  mostrarToast('Exportação para PDF finalizada.')
}

function podeAgirNoOrcamento(orcamento: Orcamento): boolean {
  return podeGerenciar.value && orcamentoEditavel(orcamento.status)
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Orçamento"
      subtitulo="Gerencie e acompanhe os orçamentos emitidos"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'orcamentoNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Orçamento
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <section
      class="indicadores"
      aria-label="Indicadores de orçamentos"
    >
      <CardIndicador
        titulo="Total de Orçamentos"
        :valor="indicadores?.emAberto ?? '—'"
        descricao="em aberto"
      />
      <CardIndicador
        titulo="Pendentes"
        :valor="indicadores?.pendentes ?? '—'"
        descricao="aguardando retorno"
        classe-cor="fp-status--meio-periodo"
      />
      <CardIndicador
        titulo="Reprovados"
        :valor="reprovados ?? '—'"
        descricao="não aprovado pelo cliente"
        classe-cor="fp-status--falta-nao-justificada"
      />
    </section>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="status"
      class="busca-orcamentos"
      placeholder="Buscar por título, número ou cliente..."
      rotulo-filtro="Status:"
      :opcoes="opcoesStatus"
    >
      <template #filtros-extra>
        <GrupoChips
          v-model="tipo"
          rotulo="Tipo:"
          :opcoes="opcoesTipo"
        />
      </template>
    </CardBuscaFiltro>

    <TabelaDados
      v-model:pagina="pagina"
      class="tabela-orcamentos"
      rotulo="Orçamentos"
      :colunas="colunas"
      :linhas="orcamentos"
      :chave-linha="(orcamento: Orcamento) => orcamento.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum orçamento encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-numero="{ linha }">
        <span class="celula-principal celula-numero">{{ formatarNumeroOrcamento(linha.numero) }}</span>
      </template>
      <template #celula-titulo="{ linha }">
        <span
          class="fp-celula-nome celula-bloco celula-corte"
          :title="linha.titulo"
        >{{ linha.titulo }}</span>
        <SeloTipoOrcamento :tipo="linha.tipo" />
      </template>
      <template #celula-cliente="{ linha }">
        <span
          class="celula-principal celula-corte"
          :title="linha.cliente.nome"
        >{{ linha.cliente.nome }}</span>
        <span class="celula-secundaria">{{ isoParaDataBr(linha.dataEmissao) }}</span>
      </template>
      <template #celula-cidade="{ linha }">
        <span class="celula-principal celula-quebra">{{ linha.cliente.cidade }}</span>
      </template>
      <template #celula-valor="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.valorTotal) }}</span>
      </template>
      <template #celula-status="{ linha }">
        <SeloStatusOrcamento :status="linha.status" />
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="`orçamento ${formatarNumeroOrcamento(linha.numero)}`"
            @click="abrir('visualizar', linha)"
          />
          <BotaoAcao
            v-if="podeAgirNoOrcamento(linha)"
            tipo="editar"
            :alvo="`orçamento ${formatarNumeroOrcamento(linha.numero)}`"
            @click="abrir('editar', linha)"
          />
          <BotaoAcao
            tipo="baixar"
            :alvo="`orçamento ${formatarNumeroOrcamento(linha.numero)}`"
            @click="imprimindo = linha"
          />
          <BotaoAcao
            v-if="podeAgirNoOrcamento(linha)"
            tipo="aprovar"
            :alvo="`orçamento ${formatarNumeroOrcamento(linha.numero)}`"
            @click="abrir('aprovar', linha)"
          />
        </div>
      </template>
    </TabelaDados>

    <OrcamentoModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :orcamento="modal.orcamento"
      :pode-gerenciar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.orcamento)"
      @aprovar="abrir('aprovar', modal.orcamento)"
      @baixar-pdf="imprimindo = modal.orcamento"
      @status="abrirStatus(modal.orcamento, $event)"
    />
    <OrcamentoModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.orcamento.id"
      :orcamento="modal.orcamento"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <OrcamentoModalAprovar
      v-else-if="modal?.tipo === 'aprovar'"
      :key="modal.orcamento.id"
      :orcamento="modal.orcamento"
      @fechar="fecharModal"
      @aprovado="aoAprovar"
      @desatualizado="carregar"
    />
    <OrcamentoModalStatus
      v-else-if="modal?.tipo === 'status'"
      :orcamento="modal.orcamento"
      :destino="modal.destino"
      @fechar="cancelarStatus"
      @concluido="aoAlterarStatus"
    />

    <OrcamentoImpressao
      v-if="imprimindo"
      :key="imprimindo.id"
      :orcamento="imprimindo"
      @concluido="aoConcluirPdf"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

/* Figma: três cartões de mesma largura, 22px entre eles. */
.indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

/* Com Aprovado e Cancelado a linha de filtros não cabe ao lado da busca: os grupos descem juntos. */
.busca-orcamentos {
  flex-wrap: wrap;
}

.busca-orcamentos :deep(.card-busca-campo) {
  flex: 1 1 280px;
}

.busca-orcamentos :deep(.card-busca-filtros) {
  flex: 0 1 auto;
}

/* Colunas mais justas que o padrão e, abaixo de ~880px de largura útil, rolagem horizontal em vez de espremer. */
.tabela-orcamentos :deep(table) {
  min-width: 880px;
}

.tabela-orcamentos :deep(th),
.tabela-orcamentos :deep(td) {
  padding-inline: 10px;
}

.acoes {
  display: flex;
  gap: 6px;
}

/* Valor principal (13px #333) e linha de apoio abaixo (11px #999), como no Figma. */
.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-numero {
  font-weight: 600;
}

.celula-valor {
  font-weight: 600;
}

.celula-bloco {
  display: block;
}

.celula-corte {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Cidade longa quebra em duas linhas (Figma) em vez de virar reticências. */
.celula-quebra {
  line-height: 1.3;
  white-space: normal;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}

@media (max-width: 1000px) {
  .indicadores {
    grid-template-columns: 1fr;
  }
}
</style>
