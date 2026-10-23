<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import SeloStatusCobranca from '../../components/cobrancas/SeloStatusCobranca.vue'
import SeloTipoOrcamento from '../../components/orcamentos/SeloTipoOrcamento.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import CardIndicador from '../../components/ui/CardIndicador.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import {
  useListaCobrancas,
  type FiltroStatusCobranca,
  type FiltroTipoCobranca,
} from '../../composables/useListaCobrancas'
import { useExportarCobrancas } from '../../composables/useExportarCobrancas'
import type { ProjetoCobrancas } from '../../types'
import { formatarMoeda } from '../../utils/formatadores'
import { percentualRecebido } from '../../utils/cobrancas'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'

const router = useRouter()

const {
  busca,
  status,
  tipo,
  pagina,
  porPagina,
  filtros,
  projetos,
  total,
  indicadores,
  contagem,
  carregandoContagem,
  carregando,
  erro,
  carregarTudo,
} = useListaCobrancas()
const exportacao = useExportarCobrancas(filtros)

const opcoesTipo: OpcaoFiltro<FiltroTipoCobranca>[] = [
  { valor: 'TODOS', rotulo: 'Todos os tipos' },
  { valor: 'CONSTRUCAO_CIVIL', rotulo: 'Construção Civil' },
  { valor: 'SERRALHERIA', rotulo: 'Serralheria' },
  { valor: 'CALHAS', rotulo: 'Calhas' },
]

const opcoesStatus: OpcaoFiltro<FiltroStatusCobranca>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'EM_ABERTO', rotulo: 'Em Aberto' },
  { valor: 'PARCIAL', rotulo: 'Parcial' },
  { valor: 'PAGO', rotulo: 'Pago' },
]

// Figma (GERENCIAR COBRANÇA): sem coluna de ações, a linha inteira abre o detalhe.
const colunas: ColunaTabela[] = [
  { chave: 'projeto', rotulo: 'Projeto', largura: '28%' },
  { chave: 'cliente', rotulo: 'Cliente', largura: '17%' },
  { chave: 'tipo', rotulo: 'Tipo', largura: '14%' },
  { chave: 'valor', rotulo: 'Valor', largura: '14%', numerica: true },
  { chave: 'recebido', rotulo: 'Recebido', largura: '14%', numerica: true },
  { chave: 'status', rotulo: 'Status', largura: '13%' },
]

function irParaDetalhes(projeto: ProjetoCobrancas) {
  void router.push({ name: 'cobrancaDetalhes', params: { projetoId: projeto.projetoId } })
}

function plural(quantidade: number, singular: string, pluralTexto: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
}

/** Texto de apoio dos cartões de contagem: "—" quando a contagem falhou (nunca "carregando" para sempre). */
function textoContagem(montar: (c: NonNullable<typeof contagem.value>) => string): string {
  if (contagem.value) return montar(contagem.value)
  return carregandoContagem.value || carregando.value ? 'carregando...' : '—'
}

onMounted(carregarTudo)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Gerenciar Cobrança"
      subtitulo="Acompanhe os recebimentos dos projetos iniciados"
    >
      <template #acao>
        <!-- Fora do Figma: relatório com os mesmos filtros da lista. -->
        <div
          class="exportar"
          role="group"
          aria-label="Exportar relatório de cobranças"
        >
          <span class="exportar-rotulo">Exportar:</span>
          <BotaoFp
            variante="secundario"
            tamanho="pagina"
            :carregando="exportacao.exportando.value === 'pdf'"
            :desabilitado="exportacao.exportando.value !== null"
            @click="exportacao.exportar('pdf')"
          >
            PDF
          </BotaoFp>
          <BotaoFp
            variante="secundario"
            tamanho="pagina"
            :carregando="exportacao.exportando.value === 'excel'"
            :desabilitado="exportacao.exportando.value !== null"
            @click="exportacao.exportar('excel')"
          >
            Excel
          </BotaoFp>
        </div>
      </template>
    </CabecalhoPagina>

    <section
      class="indicadores"
      aria-label="Indicadores de cobranças"
    >
      <CardIndicador
        titulo="Total a Receber"
        :valor="indicadores ? formatarMoeda(indicadores.totalAReceber) : '—'"
        :descricao="textoContagem((c) => plural(c.iniciados, 'projeto iniciado', 'projetos iniciados'))"
      />
      <CardIndicador
        titulo="Total em Aberto"
        :valor="indicadores ? formatarMoeda(indicadores.totalEmAberto) : '—'"
        :descricao="textoContagem((c) => `${c.semPagamento} ${c.semPagamento === 1 ? 'projeto não recebeu' : 'projetos não receberam'} pagamento`)"
        classe-cor="fp-status--meio-periodo"
      />
      <CardIndicador
        titulo="Total Recebido"
        :valor="indicadores ? formatarMoeda(indicadores.totalRecebido) : '—'"
        :descricao="textoContagem((c) => `${c.comPagamento} ${c.comPagamento === 1 ? 'projeto recebeu' : 'projetos receberam'} pagamento`)"
        classe-cor="fp-status--presente"
      />
    </section>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="tipo"
      class="busca-cobrancas"
      placeholder="Buscar projeto ou cliente..."
      rotulo-filtro="Tipo:"
      :opcoes="opcoesTipo"
    >
      <template #filtros-extra>
        <GrupoChips
          v-model="status"
          rotulo="Status:"
          :opcoes="opcoesStatus"
        />
      </template>
    </CardBuscaFiltro>

    <TabelaDados
      v-model:pagina="pagina"
      class="tabela-cobrancas"
      rotulo="Projetos com cobranças"
      :colunas="colunas"
      :linhas="projetos"
      :chave-linha="(projeto: ProjetoCobrancas) => projeto.projetoId"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      linha-clicavel
      texto-vazio="Nenhum projeto com cobranças encontrado."
      @tentar-novamente="carregarTudo"
      @abrir-linha="irParaDetalhes"
    >
      <template #celula-projeto="{ linha }">
        <RouterLink
          :to="{ name: 'cobrancaDetalhes', params: { projetoId: linha.projetoId } }"
          class="fp-celula-nome projeto-link"
          :title="linha.titulo"
        >
          {{ linha.titulo }}
        </RouterLink>
        <span class="celula-secundaria">
          {{ formatarNumeroOrcamento(linha.numero) }} • {{ plural(linha.quantidadeCobrancas, 'cobrança', 'cobranças') }}
        </span>
      </template>
      <template #celula-cliente="{ linha }">
        <span class="celula-principal">{{ linha.cliente.nome }}</span>
      </template>
      <template #celula-tipo="{ linha }">
        <SeloTipoOrcamento :tipo="linha.tipo" />
      </template>
      <template #celula-valor="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.valorTotal) }}</span>
      </template>
      <template #celula-recebido="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.valorRecebido) }}</span>
        <span
          class="barra"
          aria-hidden="true"
        >
          <span
            class="barra-preenchida"
            :style="{ width: `${percentualRecebido(linha)}%` }"
          />
        </span>
      </template>
      <template #celula-status="{ linha }">
        <span class="status-linha">
          <SeloStatusCobranca :status="linha.status" />
          <svg
            class="status-seta"
            viewBox="0 0 24 24"
            width="17"
            height="17"
            aria-hidden="true"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </template>
    </TabelaDados>
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

.exportar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.exportar-rotulo {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

/* Figma: três cartões de mesma largura, 22px entre eles. */
.indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

/* Tipo e Status não cabem na mesma linha da busca em telas estreitas: descem juntos. */
.busca-cobrancas {
  flex-wrap: wrap;
}

.busca-cobrancas :deep(.card-busca-campo) {
  flex: 1 1 260px;
}

.busca-cobrancas :deep(.card-busca-filtros) {
  flex: 0 1 auto;
}

/* Cabem as 5 linhas da página (cabeçalho 42 + 5 x 70 + rodapé 63): se a tela for baixa, a página rola em vez de cortar a última. */
.tabela-cobrancas {
  min-height: 460px;
}

/* Abaixo de ~760px de largura útil, rolagem horizontal em vez de espremer as colunas. */
.tabela-cobrancas :deep(table) {
  min-width: 760px;
}

.tabela-cobrancas :deep(th),
.tabela-cobrancas :deep(td) {
  padding-inline: 10px;
}

.tabela-cobrancas :deep(td) {
  height: 70px;
  padding-block: 8px;
}

.projeto-link {
  text-decoration: none;
}

.projeto-link:hover {
  text-decoration: underline;
}

.projeto-link:focus-visible {
  outline: none;
  border-radius: 4px;
  box-shadow: var(--fp-foco);
}

/* Barra de progresso do recebido (Figma: 4px sob o valor). */
.barra {
  display: block;
  height: 4px;
  margin-top: 4px;
  border-radius: 999px;
  background-color: var(--fp-cinza-borda);
  overflow: hidden;
}

.barra-preenchida {
  display: block;
  height: 100%;
  border-radius: 999px;
  background-color: var(--fp-verde);
}

.status-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

/* Indica que a linha inteira abre o detalhe. */
.status-seta {
  flex-shrink: 0;
  fill: none;
  stroke: var(--fp-cinza-rotulo);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Valor principal (13px #333) e linha de apoio abaixo (11px #999), como no Figma. */
.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-valor {
  font-weight: 600;
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
