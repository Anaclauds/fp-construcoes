<script setup lang="ts">
import { computed } from 'vue'
import type { Orcamento } from '../../types'
import { formatarMoeda, formatarTelefone, isoParaDataBr } from '../../utils/formatadores'
import {
  ROTULO_STATUS_ORCAMENTO,
  ROTULO_TIPO_ORCAMENTO,
  calcularResumo,
  centavosParaMoeda,
  decimalApiParaTexto,
  formatarNumeroOrcamento,
  rotuloUnidade,
} from '../../utils/orcamentos'
import DocumentoAssinaturas from '../ui/DocumentoAssinaturas.vue'
import DocumentoCabecalho from '../ui/DocumentoCabecalho.vue'

const props = defineProps<{
  orcamento: Orcamento
  /** Endereço do cliente numa linha, quando o usuário pode consultá-lo. */
  enderecoCliente?: string | null
  /** "16/07/2026 às 14:32". */
  emitidoEm: string
  emitidoPor: string
}>()

const numero = computed(() => formatarNumeroOrcamento(props.orcamento.numero))
const desconto = computed(() => Number(props.orcamento.desconto))

const materiais = computed(() =>
  props.orcamento.materiais.map((item) => ({
    chave: item.id,
    nome: item.material.nome,
    codigo: item.material.codigo,
    unidade: rotuloUnidade(item.material.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

const servicos = computed(() =>
  props.orcamento.servicos.map((item) => ({
    chave: item.id,
    nome: item.servico.nome,
    descricao: item.descricaoAdicional,
    unidade: rotuloUnidade(item.servico.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

// Subtotais pela mesma conta do backend, para somar com o total oficial do orçamento.
const subtotais = computed(() =>
  calcularResumo(
    props.orcamento.materiais.map((i) => ({ quantidade: decimalApiParaTexto(i.quantidade), valorUnitario: decimalApiParaTexto(i.valorUnitario, 2) })),
    props.orcamento.servicos.map((i) => ({ quantidade: decimalApiParaTexto(i.quantidade), valorUnitario: decimalApiParaTexto(i.valorUnitario, 2) })),
  ),
)

const prazo = computed(() => {
  const dias = props.orcamento.prazoEstimadoDias
  return `${dias} ${dias === 1 ? 'dia' : 'dias'}`
})
</script>

<template>
  <!-- Folha A4 do orçamento (impressão / PDF). Mesmo estilo do Relatório de Frequência. -->
  <article class="documento">
    <DocumentoCabecalho
      :titulo="`Orçamento ${numero}`"
      :dados="[
        { rotulo: 'Data do orçamento', valor: isoParaDataBr(orcamento.dataEmissao) },
        { rotulo: 'Situação', valor: ROTULO_STATUS_ORCAMENTO[orcamento.status] },
      ]"
      impressao
    />

    <section class="documento-resumo">
      <div>
        <p class="rotulo">
          Cliente
        </p>
        <p class="documento-destaque">
          {{ orcamento.cliente.nome }}
        </p>
        <p class="documento-apoio">
          {{ formatarTelefone(orcamento.cliente.telefone) }}
        </p>
        <p class="documento-apoio">
          {{ enderecoCliente || `${orcamento.cliente.cidade}/${orcamento.cliente.estado}` }}
        </p>
      </div>
      <div>
        <p class="rotulo">
          Orçamento
        </p>
        <p class="documento-destaque">
          {{ orcamento.titulo }}
        </p>
        <p class="documento-apoio">
          Tipo: {{ ROTULO_TIPO_ORCAMENTO[orcamento.tipo] }}
        </p>
        <p class="documento-apoio">
          Prazo estimado de entrega: {{ prazo }}
        </p>
      </div>
    </section>

    <section
      v-if="materiais.length > 0"
      class="documento-itens"
    >
      <p class="rotulo">
        Materiais
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">
              Descrição
            </th>
            <th
              scope="col"
              class="documento-un"
            >
              Un.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Qtd.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Valor unit.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in materiais"
            :key="item.chave"
          >
            <td>
              {{ item.nome }}
              <span class="documento-codigo">{{ item.codigo }}</span>
            </td>
            <td class="documento-un">
              {{ item.unidade }}
            </td>
            <td class="documento-num">
              {{ item.quantidade }}
            </td>
            <td class="documento-num">
              {{ item.valorUnitario }}
            </td>
            <td class="documento-num">
              {{ item.total }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section
      v-if="servicos.length > 0"
      class="documento-itens"
    >
      <p class="rotulo">
        Serviços / Mão de obra
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">
              Descrição
            </th>
            <th
              scope="col"
              class="documento-un"
            >
              Un.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Qtd.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Valor unit.
            </th>
            <th
              scope="col"
              class="documento-num"
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in servicos"
            :key="item.chave"
          >
            <td>
              {{ item.nome }}
              <span
                v-if="item.descricao"
                class="documento-codigo"
              >{{ item.descricao }}</span>
            </td>
            <td class="documento-un">
              {{ item.unidade }}
            </td>
            <td class="documento-num">
              {{ item.quantidade }}
            </td>
            <td class="documento-num">
              {{ item.valorUnitario }}
            </td>
            <td class="documento-num">
              {{ item.total }}
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="documento-totais">
      <div
        v-if="orcamento.observacoes"
        class="documento-observacoes"
      >
        <p class="rotulo">
          Observações
        </p>
        <p class="documento-texto">
          {{ orcamento.observacoes }}
        </p>
      </div>
      <dl class="documento-valores">
        <template v-if="materiais.length > 0">
          <dt>Materiais</dt>
          <dd>{{ centavosParaMoeda(subtotais.materiais) }}</dd>
        </template>
        <template v-if="servicos.length > 0">
          <dt>Serviços</dt>
          <dd>{{ centavosParaMoeda(subtotais.servicos) }}</dd>
        </template>
        <template v-if="desconto > 0">
          <dt>Desconto</dt>
          <dd>- {{ formatarMoeda(desconto) }}</dd>
        </template>
        <dt class="documento-total-rotulo">
          Valor total
        </dt>
        <dd class="documento-total-valor">
          {{ formatarMoeda(orcamento.valorTotal) }}
        </dd>
      </dl>
    </section>

    <!-- Declaração e assinaturas ficam juntas e inteiras no fim do documento (nunca partidas entre páginas). -->
    <div class="documento-fechamento">
      <p class="documento-declaracao">
        Este orçamento foi elaborado com base nas informações acima. O prazo estimado de entrega é de
        {{ prazo }}. Ao assinar, o cliente declara estar de acordo com os itens, valores e condições apresentados.
      </p>

      <DocumentoAssinaturas
        :assinaturas="[
          { nome: orcamento.cliente.nome, papel: 'Cliente' },
          { nome: 'FP Construções', papel: emitidoPor },
        ]"
        impressao
      />
    </div>

    <footer class="documento-rodape">
      <span>FP Construções · Orçamento {{ numero }} gerado em {{ emitidoEm }}</span>
    </footer>
  </article>
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

.documento-resumo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  padding: 12px 0;
  border-bottom: 1px solid var(--fp-cinza-borda);
}

.documento-destaque {
  color: #111;
  font-size: 15px;
  font-weight: 700;
}

.documento-apoio {
  color: #4a5565;
  font-size: 12px;
}

.documento-itens {
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

.documento-un {
  width: 15%;
  white-space: nowrap;
}

.documento-num {
  width: 14%;
  text-align: right;
  white-space: nowrap;
}

.documento-codigo {
  display: block;
  color: #6b7280;
  font-size: 10px;
  overflow-wrap: anywhere;
}

.documento-totais {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  margin-top: 14px;
  /* Sem break-inside: observações longas continuam na página seguinte; só o quadro de valores é indivisível. */
}

.documento-observacoes {
  flex: 1;
  min-width: 0;
}

.documento-texto {
  margin-top: 2px;
  color: #4a5565;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.documento-valores {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 28px;
  margin-left: auto;
  min-width: 240px;
  break-inside: avoid;
  padding: 10px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: var(--fp-cinza-fundo);
}

.documento-valores dt {
  color: #4a5565;
  font-size: 12px;
}

.documento-valores dd {
  color: #111;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
}

.documento-valores .documento-total-rotulo {
  padding-top: 6px;
  border-top: 1px solid var(--fp-cinza-borda);
  color: #111;
  font-size: 13px;
  font-weight: 700;
}

.documento-valores .documento-total-valor {
  padding-top: 6px;
  border-top: 1px solid var(--fp-cinza-borda);
  color: var(--fp-verde);
  font-size: 16px;
  font-weight: 700;
}

.documento-declaracao {
  margin-top: 14px;
  padding: 12px 18px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: var(--fp-cinza-fundo);

  color: #4a5565;
  font-size: 11px;
  line-height: 1.5;
}

.documento-fechamento {
  break-inside: avoid;
}

.documento-rodape {
  display: flex;
  justify-content: space-between;
  gap: 12px;

  margin-top: 18px;
  padding-top: 8px;
  border-top: 1px solid var(--fp-cinza-borda);

  color: #6b7280;
  font-size: 11px;
}
</style>
