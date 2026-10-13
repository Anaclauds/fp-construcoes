<script setup lang="ts">
import { computed } from 'vue'
import logoFp from '../../assets/images/logo-fp.png'
import type { RelatorioCompleto, StatusFiltroRelatorio } from '../../types'
import { diaDaSemana } from '../../utils/datas'
import { isoParaDataBr, rotuloLegivel } from '../../utils/formatadores'
import { ROTULO_STATUS, classeStatus, rotuloFiltroRelatorio } from '../../utils/frequencia'

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
    <header class="documento-topo">
      <div class="documento-marca">
        <img
          :src="logoFp"
          alt=""
          class="documento-logo"
        >
        <div>
          <p class="documento-empresa">
            FP Construções
          </p>
          <h1 class="documento-titulo">
            Relatório de Frequência
          </h1>
        </div>
      </div>
      <dl class="documento-emissao">
        <dt>Emitido em</dt>
        <dd>{{ emitidoEm }}</dd>
        <dt>Emitido por</dt>
        <dd>{{ emitidoPor }}</dd>
      </dl>
    </header>

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

    <section class="documento-assinaturas">
      <div class="documento-assinatura">
        <span class="documento-assinatura-linha" />
        <strong>{{ relatorio.funcionario.nomeCompleto }}</strong>
        <span>Funcionário</span>
        <span class="documento-assinatura-data">Data: ______ / ______ / __________</span>
      </div>
      <div class="documento-assinatura">
        <span class="documento-assinatura-linha" />
        <strong>{{ emitidoPor }}</strong>
        <span>Responsável / Administrador</span>
        <span class="documento-assinatura-data">Data: ______ / ______ / __________</span>
      </div>
    </section>

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

.documento-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  padding-bottom: 16px;
  border-bottom: 2px solid var(--fp-verde);
}

.documento-marca {
  display: flex;
  align-items: center;
  gap: 14px;
}

.documento-logo {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.documento-empresa {
  color: var(--fp-verde);
  font-size: 13px;
  font-weight: 600;
}

.documento-titulo {
  margin: 0;
  color: #111;
  font-size: 22px;
  font-weight: 700;
}

.documento-emissao {
  text-align: right;
}

.documento-emissao dt {
  color: #6b7280;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.documento-emissao dd {
  margin-bottom: 8px;
  color: #111;
  font-size: 13px;
  font-weight: 600;
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

.documento-assinaturas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 56px;

  margin-top: 40px;
  break-inside: avoid;
}

.documento-assinatura {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  color: #4a5565;
  font-size: 12px;
}

.documento-assinatura strong {
  color: #111;
  font-size: 13px;
}

.documento-assinatura-linha {
  width: 100%;
  margin-bottom: 6px;
  border-top: 1px solid #333;
}

.documento-assinatura-data {
  margin-top: 8px;
  color: #6b7280;
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

.documento--impressao .documento-titulo {
  font-size: 20px;
}

.documento--impressao .documento-logo {
  width: 48px;
  height: 48px;
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

.documento--impressao .documento-assinaturas {
  margin-top: 30px;
}

.documento--impressao .documento-rodape {
  margin-top: 18px;
}

@media (max-width: 720px) {
  .documento {
    padding: 18px 16px;
  }

  .documento-topo,
  .documento-resumo {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .documento-emissao,
  .documento-taxa {
    text-align: left;
  }
}
</style>
