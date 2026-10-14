<script setup lang="ts">
import { computed, useId } from 'vue'
import type { MovimentacaoCaixa } from '../../types/caixa'
import { rotuloCategoriaCaixa } from '../../utils/caixa'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'

const props = defineProps<{
  tipo: 'entradas' | 'saidas'
  movimentacoes: MovimentacaoCaixa[]
  /** Total do lado (vem do resumo da API). */
  total: string
}>()

const idTitulo = useId()

const titulo = computed(() => (props.tipo === 'entradas' ? 'Entradas' : 'Saídas'))
const rotuloTotal = computed(() => (props.tipo === 'entradas' ? 'Total Entradas' : 'Total Saídas'))
/** A coluna Valor cresce com o maior valor da lista (R$ 9.999.999.999,99 não cabe nos 104px de um valor comum). */
const larguraValor = computed(() => {
  const maior = props.movimentacoes.reduce((max, m) => Math.max(max, formatarMoeda(m.valor).length), 0)
  return `${Math.max(104, Math.ceil(maior * 8.4) + 24)}px`
})
const textoVazio = computed(() =>
  props.tipo === 'entradas' ? 'Nenhuma entrada neste mês.' : 'Nenhuma saída neste mês.',
)
</script>

<template>
  <section
    class="lado"
    :class="`lado--${tipo}`"
    :aria-labelledby="idTitulo"
  >
    <header class="lado-cabecalho">
      <h3
        :id="idTitulo"
        class="lado-titulo"
      >
        {{ titulo }}
      </h3>
      <span class="lado-contagem">({{ movimentacoes.length }})</span>
    </header>

    <div class="lado-corpo">
      <table v-if="movimentacoes.length > 0">
        <caption class="fp-sr-only">
          {{ titulo }} do mês
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              class="col-data"
            >
              Data
            </th>
            <th scope="col">
              Descrição
            </th>
            <th
              scope="col"
              class="col-categoria"
            >
              Categoria
            </th>
            <th
              scope="col"
              class="col-valor"
              :style="{ width: larguraValor }"
            >
              Valor
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="movimentacao in movimentacoes"
            :key="movimentacao.id"
          >
            <td class="col-data">
              {{ isoParaDataBr(movimentacao.data) }}
            </td>
            <td
              class="col-descricao"
              :title="movimentacao.descricao"
            >
              <span class="descricao">{{ movimentacao.descricao }}</span>
            </td>
            <td
              class="col-categoria"
              :title="rotuloCategoriaCaixa(movimentacao.categoria)"
            >
              {{ rotuloCategoriaCaixa(movimentacao.categoria) }}
            </td>
            <td
              class="col-valor"
              :title="formatarMoeda(movimentacao.valor)"
            >
              {{ formatarMoeda(movimentacao.valor) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-else
        class="lado-vazio"
      >
        {{ textoVazio }}
      </p>
    </div>

    <footer class="lado-total">
      <span>{{ rotuloTotal }}</span>
      <strong>{{ formatarMoeda(total) }}</strong>
    </footer>
  </section>
</template>

<style scoped>
.lado {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.lado-cabecalho {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 14px 18px;
}

.lado-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 600;
}

.lado-contagem {
  color: var(--fp-cinza-rotulo);
  font-size: 14px;
  font-weight: 500;
}

/* Rola por dentro quando há muitos lançamentos; cabeçalho e total ficam sempre visíveis. */
.lado-corpo {
  flex: 1 1 0;
  min-height: 0;
  overflow: auto;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;

  height: 34px;
  padding: 0 10px;
  border-block: 1px solid var(--fp-cinza-borda);
  background-color: var(--fp-cinza-fundo);

  color: var(--fp-cinza-rotulo);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.27px;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  height: 48px;
  padding: 4px 10px;
  border-bottom: 1px solid #f0f1f3;

  color: var(--fp-texto-corpo);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

th:first-child,
td:first-child {
  padding-left: 18px;
}

th:last-child,
td:last-child {
  padding-right: 18px;
}

.col-data {
  width: 110px;
}

.col-categoria {
  width: 20%;
}

.col-valor {
  width: 104px;
  text-align: right;
}

td.col-valor {
  color: #333;
  font-weight: 600;
}

.col-descricao {
  color: #333;
}

.descricao {
  /* Até duas linhas: o número do projeto e a parcela ficam visíveis sem esticar a coluna. */
  display: -webkit-box;
  overflow: hidden;
  line-height: 1.3;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.lado-vazio {
  margin: 0;
  padding: 36px 18px;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.lado-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 11px 18px;
  border-top: 1px solid var(--fp-cinza-borda);
  background-color: var(--fp-cinza-fundo);

  color: var(--fp-texto-titulo-campo);
  font-size: 14px;
  font-weight: 500;
}

.lado-total strong {
  font-size: 15px;
  font-weight: 600;
}

.lado--entradas .lado-total strong {
  color: #008236;
}

.lado--saidas .lado-total strong {
  color: var(--fp-vermelho-escuro);
}
</style>
