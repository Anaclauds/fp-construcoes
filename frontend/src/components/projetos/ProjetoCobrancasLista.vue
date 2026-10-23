<script setup lang="ts">
import { computed } from 'vue'
import type { CobrancaProjeto, ParcelaProjeto, StatusProjeto } from '../../types/projeto'
import { recebidoDaParcelaEmCentavos, ROTULO_FORMA_PAGAMENTO, ROTULO_TIPO_COBRANCA } from '../../utils/cobrancas'
import { hojeIso } from '../../utils/datas'
import { formatarMoeda, isoParaDataBr, paraCentavos } from '../../utils/formatadores'
import SeloStatusCobranca from '../cobrancas/SeloStatusCobranca.vue'

const props = defineProps<{
  cobrancas: CobrancaProjeto[]
  statusProjeto: StatusProjeto
  construcaoCivil: boolean
}>()

// Parcelas canceladas (etapa ou projeto cancelado) continuam na lista, mas não entram na contagem do título.
const parcelasVigentes = computed(() =>
  props.cobrancas.flatMap((cobranca) => cobranca.parcelas).filter((parcela) => parcela.status !== 'CANCELADA'),
)
const totalParcelas = computed(() => parcelasVigentes.value.length)

const todasPagas = computed(
  () => totalParcelas.value > 0 && parcelasVigentes.value.every((parcela) => parcela.status === 'PAGA'),
)

// Figma (projeto concluído): "Pagamentos Realizados (n)" com "Pago no dia"; só quando tudo foi de fato pago.
const titulo = computed(() =>
  props.statusProjeto === 'CONCLUIDO' && todasPagas.value
    ? `Pagamentos Realizados (${totalParcelas.value})`
    : `Formas de Pagamento (${totalParcelas.value})`,
)

const textoSemCobranca = computed(() => {
  if (props.construcaoCivil) {
    return props.statusProjeto === 'PLANEJADO' || props.statusProjeto === 'EM_EXECUCAO'
      ? 'Projetos de Construção Civil são cobrados por etapa: cada etapa registrada gera uma cobrança (medição).'
      : 'Nenhuma etapa com cobrança foi registrada neste projeto.'
  }
  if (props.statusProjeto === 'PLANEJADO') return 'A cobrança será gerada quando o projeto for iniciado.'
  return 'Nenhuma cobrança registrada para este projeto.'
})

function descricaoCobranca(cobranca: CobrancaProjeto): string {
  const tipo = ROTULO_TIPO_COBRANCA[cobranca.tipo]
  const forma = cobranca.formaPagamento ? ROTULO_FORMA_PAGAMENTO[cobranca.formaPagamento] : ''
  const modalidade = cobranca.parcelas.length > 1 ? `${cobranca.parcelas.length}x` : 'À vista'
  return [tipo, modalidade, forma].filter(Boolean).join(' · ')
}

/**
 * O detalhe do projeto não traz `vencida` (só `/cobrancas` calcula): mesma regra de Cobranças, parcela em aberto ou
 * parcial com vencimento antes de hoje (fuso do negócio).
 */
function estaVencida(parcela: ParcelaProjeto): boolean {
  return (parcela.status === 'EM_ABERTO' || parcela.status === 'PARCIAL') && parcela.vencimento.slice(0, 10) < hojeIso()
}

/** Soma dos recebimentos já registrados na parcela, em centavos (mostrada nas parcelas parciais). */
const totalRecebido = recebidoDaParcelaEmCentavos

/** Quanto falta receber da parcela, em centavos. */
function restante(parcela: ParcelaProjeto): number {
  return Math.max(paraCentavos(parcela.valor) - totalRecebido(parcela), 0)
}

/** Data do último recebimento da parcela paga ("Pago no dia"). */
function dataDoPagamento(parcela: ParcelaProjeto): string {
  const datas = parcela.recebimentos.map((r) => r.dataRecebimento.slice(0, 10))
  const ultima = datas.sort().at(-1)
  return ultima ? isoParaDataBr(ultima) : ''
}
</script>

<template>
  <section class="pagamentos">
    <h4 class="pagamentos-titulo">
      {{ cobrancas.length > 0 ? titulo : 'Formas de Pagamento' }}
    </h4>

    <p
      v-if="cobrancas.length === 0"
      class="pagamentos-vazio"
    >
      {{ textoSemCobranca }}
    </p>

    <div
      v-for="cobranca in cobrancas"
      :key="cobranca.id"
      class="grupo"
    >
      <p class="grupo-titulo">
        {{ descricaoCobranca(cobranca) }}
        <span class="grupo-total">Total {{ formatarMoeda(cobranca.valorTotal) }}</span>
      </p>
      <ul class="parcelas">
        <li
          v-for="parcela in cobranca.parcelas"
          :key="parcela.id"
          class="parcela"
        >
          <div class="parcela-textos">
            <span class="parcela-nome">
              {{ cobranca.parcelas.length > 1 ? `Parcela ${parcela.numero} de ${cobranca.parcelas.length}` : 'Pagamento único' }}
            </span>
            <span class="parcela-data">
              <template v-if="parcela.status === 'PAGA' && dataDoPagamento(parcela)">
                Pago no dia: {{ dataDoPagamento(parcela) }}
              </template>
              <template v-else>
                Vencimento: {{ isoParaDataBr(parcela.vencimento) }}
              </template>
            </span>
            <span
              v-if="parcela.status === 'PARCIAL' && totalRecebido(parcela) > 0"
              class="parcela-data"
            >
              Recebido {{ formatarMoeda(totalRecebido(parcela) / 100) }} · restante
              {{ formatarMoeda(restante(parcela) / 100) }}
            </span>
          </div>
          <SeloStatusCobranca
            :status="parcela.status"
            :vencida="estaVencida(parcela)"
          />
          <span class="parcela-valor">{{ formatarMoeda(parcela.valor) }}</span>
        </li>
      </ul>
    </div>

  </section>
</template>

<style scoped>
.pagamentos-titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.pagamentos-vazio {
  margin: 0;
  padding: 12px 16px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  color: #6a7282;
  font-size: 13.5px;
}

.grupo + .grupo {
  margin-top: 14px;
}

.grupo-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 16px;
  margin: 0 0 8px;
  color: #4a5565;
  font-size: 13px;
  font-weight: 600;
}

.grupo-total {
  color: var(--fp-cinza-rotulo);
  font-weight: 500;
}

.parcelas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Figma: uma linha por parcela com nome, data, e o valor à direita. */
.parcela {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 17px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.parcela-textos {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.parcela-nome {
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.parcela-data {
  color: var(--fp-cinza-rotulo);
  font-size: 12.5px;
}

.parcela-valor {
  min-width: 104px;
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
}
</style>
