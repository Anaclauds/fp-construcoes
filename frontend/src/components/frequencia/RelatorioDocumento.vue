<script setup lang="ts">
import { computed } from 'vue'
import type { RelatorioCompleto, StatusFiltroRelatorio } from '../../types'
import { diaDaSemana } from '../../utils/datas'
import { isoParaDataBr, rotuloLegivel } from '../../utils/formatadores'
import { ROTULO_STATUS, classeStatus, rotuloFiltroRelatorio } from '../../utils/frequencia'
import DocumentoAssinaturas from '../ui/DocumentoAssinaturas.vue'
import DocumentoCabecalho from '../ui/DocumentoCabecalho.vue'

const props = defineProps<{
  relatorio: RelatorioCompleto
  /** "16/07/2026 às 14:32". */
  emitidoEm: string
  emitidoPor: string
  /** Status escolhido no filtro; com filtro, a taxa de presença deixa de fazer sentido. */
  statusFiltro?: StatusFiltroRelatorio | null
  /** Versão da folha A4 (sem moldura de pré-visualização). */
  impressao?: boolean
}>()

const periodo = computed(
  () => `${isoParaDataBr(props.relatorio.periodo.dataInicial)} – ${isoParaDataBr(props.relatorio.periodo.dataFinal)}`,
)

const linhas = computed(() =>
  props.relatorio.linhas.map((linha) => ({
    chave: linha.data,
    data: isoParaDataBr(linha.data),
    diaSemana: diaDaSemana(linha.data),
    status: linha.status,
    observacao: linha.observacao,
  })),
)

const totais = computed(() => {
  const i = props.relatorio.indicadores
  return `${i.presentes} presentes · ${i.meioPeriodo} meio período · ${i.faltasJustificadas} f. justif. · ${i.faltasNaoJustificadas} f. n. justif. · ${i.naoRegistrados} não registrados`
})

const taxa = computed(() => {
  const t = props.relatorio.indicadores.taxaPresenca
  return t === null ? '—' : `${t}%`
})

const totalDias = computed(() => {
  const n = props.relatorio.indicadores.totalDias
  return `Total: ${n} ${n === 1 ? 'dia' : 'dias'}`
})

const mensagemVazia = computed(() =>
  props.relatorio.periodoFuturo
    ? 'O período escolhido ainda não começou.'
    : 'Nenhum registro de frequência no período.',
)
</script>

<template>
  <article
    class="documento"
    :class="{ 'documento--impressao': impressao }"
  >
    <DocumentoCabecalho
      titulo="Relatório de Frequência"
      :dados="[
        { rotulo: 'Emitido em', valor: emitidoEm },
        { rotulo: 'Emitido por', valor: emitidoPor },
      ]"
      :impressao="impressao"
    />

    <section class="documento-resumo">
      <div>
        <p class="rotulo">
          Funcionário
        </p>
        <p class="documento-funcionario">
          {{ relatorio.funcionario.nomeCompleto }}
        </p>
        <p class="documento-funcao">
          {{ rotuloLegivel(relatorio.funcionario.funcao) }}
        </p>
      </div>
      <div>
        <p class="rotulo">
          Período
        </p>
        <p class="documento-valor">
          {{ periodo }}
        </p>
        <p
          v-if="statusFiltro"
          class="documento-funcao"
        >
          Filtro: {{ rotuloFiltroRelatorio(statusFiltro) }}
        </p>
        <p
          v-if="relatorio.temDiasFuturos && !relatorio.periodoFuturo"
          class="documento-nota"
        >
          Dias após hoje não entram no relatório.
        </p>
      </div>
      <div class="documento-taxa">
        <p class="rotulo">
          Taxa de presença
        </p>
        <p class="documento-taxa-valor">
          {{ taxa }}
        </p>
      </div>
    </section>

    <section class="documento-registros">
      <p class="rotulo">
        Registro diário
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">
              Data
            </th>
            <th
              scope="col"
              class="documento-dia"
            >
              Dia da Semana
            </th>
            <th scope="col">
              Status
            </th>
            <th scope="col">
              Observação
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="linha in linhas"
            :key="linha.chave"
          >
            <td>{{ linha.data }}</td>
            <td class="documento-dia">
              {{ linha.diaSemana }}
            </td>
            <td>
              <span
                class="documento-status"
                :class="classeStatus(linha.status)"
              >● {{ linha.status ? ROTULO_STATUS[linha.status] : 'Não registrado' }}</span>
            </td>
            <td>{{ linha.observacao || '—' }}</td>
          </tr>
          <tr v-if="linhas.length === 0">
            <td
              colspan="4"
              class="documento-vazio"
            >
              {{ mensagemVazia }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2">
              {{ totalDias }}
            </td>
            <td colspan="2">
              {{ totais }}
            </td>
          </tr>
        </tfoot>
      </table>
    </section>

    <p class="documento-declaracao">
      Declaro que as informações de frequência registradas neste relatório, referentes ao período de
      {{ isoParaDataBr(relatorio.periodo.dataInicial) }} a {{ isoParaDataBr(relatorio.periodo.dataFinal) }},
      são verdadeiras e estão de acordo com os registros do sistema de controle de ponto da FP Construções.
    </p>

    <DocumentoAssinaturas
      :assinaturas="[
        { nome: relatorio.funcionario.nomeCompleto, papel: 'Funcionário' },
        { nome: emitidoPor, papel: 'Responsável / Administrador' },
      ]"
      :impressao="impressao"
    />

    <footer class="documento-rodape">
      <span>FP Construções · Relatório gerado em {{ emitidoEm }}</span>
      <!-- A numeração de páginas só existe no impresso, vinda do rodapé da página (@page), que conhece o total. -->
    </footer>
  </article>
</template>

<style scoped>
.documento {
  width: 100%;
  padding: 26px 42px 24px;
  background-color: #fff;
  color: #333;
  font-size: 13px;
}

p,
dl,
dd {
  margin: 0;
}

.rotulo {
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.documento-resumo {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;

  padding: 18px 0;
  border-bottom: 1px solid var(--fp-cinza-borda);
}

.documento-funcionario {
  color: #111;
  font-size: 16px;
  font-weight: 700;
}

.documento-valor {
  color: #111;
  font-size: 15px;
  font-weight: 600;
}

.documento-funcao {
  color: #4a5565;
  font-size: 13px;
}

.documento-nota {
  margin-top: 2px;
  color: #6b7280;
  font-size: 11.5px;
  font-style: italic;
}

.documento-taxa {
  text-align: right;
}

.documento-taxa-valor {
  color: var(--fp-verde);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.documento-registros {
  padding-top: 18px;
}

table {
  width: 100%;
  margin-top: 8px;
  border: 1px solid var(--fp-cinza-borda);
  border-collapse: collapse;
}

thead {
  /* Cabeçalho se repete em cada página impressa. */
  display: table-header-group;
}

tr {
  break-inside: avoid;
}

th,
td {
  padding: 7px 12px;
  border: 1px solid var(--fp-cinza-borda);
  text-align: left;
}

th {
  background-color: var(--fp-cinza-fundo);
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

td {
  font-size: 12.5px;
}

.documento-dia {
  white-space: nowrap;
}

tfoot td {
  background-color: var(--fp-cinza-fundo);
  color: #4a5565;
  font-size: 12px;
  font-weight: 600;
}

.documento-status {
  color: var(--st-texto);
  font-weight: 600;
  white-space: nowrap;
}

.documento-vazio {
  padding: 22px;
  color: #6b7280;
  text-align: center;
}

.documento-declaracao {
  margin-top: 20px;
  padding: 12px 18px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: var(--fp-cinza-fundo);

  color: #4a5565;
  font-size: 12px;
  line-height: 1.5;
  break-inside: avoid;
}

.documento-rodape {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  margin-top: 28px;
  padding-top: 8px;
  border-top: 1px solid var(--fp-cinza-borda);

  color: #6b7280;
  font-size: 11px;
}

/* Folha A4: o navegador define as margens (@page em style.css); aqui só compacta o conteúdo. */
.documento--impressao {
  padding: 0;
  font-size: 11px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.documento--impressao .documento-resumo {
  padding: 12px 0;
}

.documento--impressao th,
.documento--impressao td {
  padding: 4px 10px;
  font-size: 11px;
}

/* O total aparece uma vez, no fim da tabela, e não repetido no rodapé de cada página. */
.documento--impressao tfoot {
  display: table-row-group;
}

.documento--impressao .documento-declaracao {
  margin-top: 14px;
  font-size: 11px;
}

.documento--impressao .documento-rodape {
  margin-top: 18px;
}

@media (max-width: 720px) {
  .documento {
    padding: 18px 16px;
  }

  .documento-resumo {
    grid-template-columns: 1fr;
  }

  .documento-taxa {
    text-align: left;
  }
}
</style>
