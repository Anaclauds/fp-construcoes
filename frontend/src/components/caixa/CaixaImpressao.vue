<script setup lang="ts">
import { nextTick, onMounted, useTemplateRef } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useImpressao } from '../../composables/useImpressao'
import type { Caixa } from '../../types/caixa'
import {
  ROTULO_SITUACAO_CAIXA,
  competenciaDoCaixa,
  rotuloCategoriaCaixa,
  rotuloCompetencia,
  situacaoDoCaixa,
} from '../../utils/caixa'
import { formatarDataHora } from '../../utils/datas'
import { formatarDataHoraIso, formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import DocumentoAssinaturas from '../ui/DocumentoAssinaturas.vue'
import DocumentoCabecalho from '../ui/DocumentoCabecalho.vue'

/**
 * Folha A4 do caixa do mês (impressão / PDF): monta fora do #app (`.fp-area-impressao`, invisível na tela) e abre a
 * impressão do navegador, onde o usuário escolhe a impressora ou "Salvar como PDF". Monte com `v-if`;
 * `concluido` avisa que o diálogo fechou.
 */
const props = defineProps<{ caixa: Caixa }>()

const emit = defineEmits<{ concluido: [] }>()

const { usuario } = useAuth()
const { imprimir } = useImpressao()

const area = useTemplateRef<HTMLElement>('area')
// Fixado ao pedir a impressão: a data/hora do papel não muda enquanto o diálogo está aberto.
const emitidoEm = formatarDataHora()
const emitidoPor = usuario.value?.nomeCompleto ?? 'Usuário'
const competencia = competenciaDoCaixa(props.caixa)
const rotulo = rotuloCompetencia(competencia)

const dadosCabecalho = [
  { rotulo: 'Competência', valor: rotulo },
  { rotulo: 'Situação', valor: ROTULO_SITUACAO_CAIXA[situacaoDoCaixa(props.caixa)] },
  { rotulo: 'Emitido em', valor: emitidoEm },
]

const lados = [
  { titulo: 'Entradas', rotuloTotal: 'Total Entradas', itens: props.caixa.entradas, total: props.caixa.resumo.totalEntradas },
  { titulo: 'Saídas', rotuloTotal: 'Total Saídas', itens: props.caixa.saidas, total: props.caixa.resumo.totalSaidas },
]

onMounted(async () => {
  await nextTick()
  // Espera o logo carregar: imprimir antes dele sair em branco.
  const imagens = Array.from(area.value?.querySelectorAll('img') ?? [])
  await Promise.all(imagens.map((imagem) => imagem.decode().catch(() => undefined)))

  imprimir(`Caixa-${competencia}`, () => emit('concluido'))
})
</script>

<template>
  <!-- Fora do #app (que some no @media print) e invisível na tela. -->
  <Teleport to="body">
    <div
      ref="area"
      class="fp-area-impressao"
    >
      <article class="documento">
        <DocumentoCabecalho
          :titulo="`Caixa de ${rotulo}`"
          :dados="dadosCabecalho"
          impressao
        />

        <dl class="resumo">
          <div>
            <dt>Valor Inicial</dt>
            <dd>{{ formatarMoeda(caixa.resumo.valorInicial) }}</dd>
          </div>
          <div>
            <dt>Total Entradas</dt>
            <dd>{{ formatarMoeda(caixa.resumo.totalEntradas) }}</dd>
          </div>
          <div>
            <dt>Total Saídas</dt>
            <dd>{{ formatarMoeda(caixa.resumo.totalSaidas) }}</dd>
          </div>
          <div>
            <dt>{{ caixa.status === 'FECHADO' ? 'Saldo final' : 'Saldo atual' }}</dt>
            <dd class="resumo-saldo">
              {{ formatarMoeda(caixa.resumo.saldoAtual) }}
            </dd>
          </div>
        </dl>

        <section
          v-for="lado in lados"
          :key="lado.titulo"
          class="lado"
        >
          <p class="rotulo">
            {{ lado.titulo }} ({{ lado.itens.length }})
          </p>
          <table v-if="lado.itens.length > 0">
            <thead>
              <tr>
                <th class="col-data">
                  Data
                </th>
                <th>Descrição</th>
                <th class="col-categoria">
                  Categoria
                </th>
                <th class="col-valor">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in lado.itens"
                :key="item.id"
              >
                <td>{{ isoParaDataBr(item.data) }}</td>
                <td>{{ item.descricao }}</td>
                <td>{{ rotuloCategoriaCaixa(item.categoria) }}</td>
                <td class="col-valor">
                  {{ formatarMoeda(item.valor) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">
                  {{ lado.rotuloTotal }}
                </td>
                <td class="col-valor">
                  {{ formatarMoeda(lado.total) }}
                </td>
              </tr>
            </tfoot>
          </table>
          <p
            v-else
            class="vazio"
          >
            Nenhum lançamento.
          </p>
        </section>

        <p
          v-if="caixa.status === 'FECHADO' && caixa.fechadoEm"
          class="fechamento"
        >
          Caixa fechado em {{ formatarDataHoraIso(caixa.fechadoEm) }}
          <template v-if="caixa.fechadoPorUsuario">
            por {{ caixa.fechadoPorUsuario.funcionario?.nomeCompleto ?? caixa.fechadoPorUsuario.login }}
          </template>.
        </p>

        <DocumentoAssinaturas
          :assinaturas="[
            { nome: emitidoPor, papel: 'Responsável pela emissão' },
            { nome: 'FP Construções', papel: 'Conferência' },
          ]"
          impressao
        />
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.documento {
  width: 100%;
  background-color: #fff;
  color: #333;
  font-size: 11px;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
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

.resumo {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--fp-cinza-borda);
}

.resumo dt {
  color: #6b7280;
  font-size: 11px;
}

.resumo dd {
  color: #111;
  font-size: 14px;
  font-weight: 700;
}

.resumo-saldo {
  color: var(--fp-verde);
}

.lado {
  padding-top: 14px;
}

table {
  width: 100%;
  margin-top: 6px;
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
  padding: 4px 10px;
  border: 1px solid var(--fp-cinza-borda);
  text-align: left;
  font-size: 11px;
}

th {
  background-color: var(--fp-cinza-fundo);
  color: #6b7280;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

tfoot td {
  background-color: var(--fp-cinza-fundo);
  font-weight: 700;
}

.col-data {
  width: 12%;
  white-space: nowrap;
}

.col-categoria {
  width: 18%;
}

.col-valor {
  width: 16%;
  text-align: right;
  white-space: nowrap;
}

.vazio {
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}

.fechamento {
  margin-top: 14px;
  color: #4a5565;
  font-size: 11px;
}
</style>
