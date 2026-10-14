<script setup lang="ts">
import { computed } from 'vue'
import type { CamposCobrancaProjeto, ErrosCobrancaProjeto } from '../../composables/useCobrancaProjeto'
import { isoParaDataBr } from '../../utils/formatadores'
import { filtrarDecimal, normalizarDecimal } from '../../utils/orcamentos'
import { ANO_MINIMO_DATA_PROJETO, opcoesFormaPagamento, type CobrancaCalculada } from '../../utils/projetos'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ProjetoSeletorModalidade from './ProjetoSeletorModalidade.vue'

const props = defineProps<{
  campos: CamposCobrancaProjeto
  erros: ErrosCobrancaProjeto
  parcelado: boolean
  acrescimoHabilitado: boolean
  resultado: CobrancaCalculada
}>()

const opcoesForma = computed(() => opcoesFormaPagamento(props.campos.modalidade))

const mascararPercentual = (valor: string) => filtrarDecimal(valor, 2, 3)
const normalizarPercentual = (valor: string) => normalizarDecimal(valor, 2, 3)
const somenteDigitos = (valor: string) => valor.replace(/\D/g, '').slice(0, 2)

/** Vencimentos das demais parcelas (calculados mês a mês a partir do 1º): só leitura. */
const seguintes = computed(() =>
  props.parcelado ? props.resultado.parcelas.slice(1).filter((parcela) => parcela.vencimento !== '') : [],
)

/** Até a 4ª parcela as datas aparecem em caixas; de 5 em diante vira resumo, para 60 parcelas não alongarem o modal. */
const MAXIMO_CAIXAS = 3
const seguintesVisiveis = computed(() => seguintes.value.slice(0, MAXIMO_CAIXAS))
const restantes = computed(() => seguintes.value.slice(MAXIMO_CAIXAS))
const resumoRestantes = computed(() => {
  const ultima = restantes.value[restantes.value.length - 1]
  if (!ultima) return ''
  const quantidade = restantes.value.length
  return `… + ${quantidade} ${quantidade === 1 ? 'parcela mensal' : 'parcelas mensais'} até ${isoParaDataBr(ultima.vencimento)}`
})

/** Vencimento nos dias 29 a 31: em meses mais curtos a parcela cai no último dia do mês (explicado na prévia). */
const diaDoVencimento = computed(() => Number(props.resultado.parcelas[0]?.vencimento.slice(8, 10)) || 0)
const notaMesCurto = computed(() => props.parcelado && seguintes.value.length > 0 && diaDoVencimento.value >= 29)

const avisoAcrescimo = computed(() =>
  props.acrescimoHabilitado ? undefined : 'Disponível com cartão de crédito, cartão de débito ou boleto.',
)
</script>

<template>
  <div class="cobranca-campos">
    <ProjetoSeletorModalidade v-model="campos.modalidade" />

    <CampoFormulario
      v-if="parcelado"
      v-model="campos.parcelas"
      rotulo="Quantidade de Parcelas"
      obrigatorio
      placeholder="2"
      inputmode="numeric"
      autocomplete="off"
      :mascara="somenteDigitos"
      :erro="erros.parcelas"
    />

    <CampoData
      v-model="campos.primeiroVencimento"
      :rotulo="parcelado ? 'Data de Vencimento da 1ª Parcela' : 'Data de Vencimento'"
      obrigatorio
      :ano-minimo="ANO_MINIMO_DATA_PROJETO"
      :erro="erros.primeiroVencimento"
    />

    <ul
      v-if="seguintes.length > 0"
      class="seguintes"
      aria-label="Vencimentos das demais parcelas"
    >
      <li
        v-for="parcela in seguintesVisiveis"
        :key="parcela.numero"
      >
        <span class="seguintes-rotulo">{{ parcela.numero }}ª parcela</span>
        <span class="seguintes-data">{{ isoParaDataBr(parcela.vencimento) }}</span>
      </li>
      <li
        v-if="resumoRestantes"
        class="seguintes-resumo"
      >
        {{ resumoRestantes }}
      </li>
    </ul>

    <p
      v-if="notaMesCurto"
      class="seguintes-nota"
    >
      Em meses mais curtos o vencimento cai no último dia do mês.
    </p>

    <div class="percentuais">
      <CampoFormulario
        v-model="campos.acrescimo"
        rotulo="Acréscimo (%)"
        placeholder="0"
        autocomplete="off"
        inputmode="decimal"
        :mascara="mascararPercentual"
        :normalizar="normalizarPercentual"
        :desabilitado="!acrescimoHabilitado"
        :erro="erros.acrescimo"
        :aviso="avisoAcrescimo"
      />
      <CampoFormulario
        v-model="campos.desconto"
        rotulo="Desconto (%)"
        placeholder="0"
        autocomplete="off"
        inputmode="decimal"
        :mascara="mascararPercentual"
        :normalizar="normalizarPercentual"
        :erro="erros.desconto"
      />
    </div>

    <CampoFormulario
      v-model="campos.forma"
      rotulo="Forma de Pagamento"
      tipo="select"
      obrigatorio
      placeholder="Selecione..."
      :opcoes="opcoesForma"
      :erro="erros.forma"
    />
  </div>
</template>

<style scoped>
.cobranca-campos {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.percentuais {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

.seguintes-nota {
  margin: -8px 0 0;
  color: #717182;
  font-size: 12.5px;
}

/* Datas calculadas das parcelas seguintes: leitura, em colunas para não alongar o modal. */
.seguintes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  margin: -4px 0 0;
  padding: 0;
  list-style: none;
}

.seguintes li {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 8px;
  background-color: var(--fp-cinza-fundo);
}

.seguintes li.seguintes-resumo {
  grid-column: 1 / -1;
  padding: 4px 2px;
  border: 0;
  background: none;
  color: var(--fp-cinza-rotulo);
  font-size: 13px;
}

.seguintes-rotulo {
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}

.seguintes-data {
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

@media (max-width: 560px) {
  .percentuais {
    grid-template-columns: 1fr;
  }
}
</style>
