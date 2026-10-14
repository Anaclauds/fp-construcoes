<script setup lang="ts">
import { computed } from 'vue'
import type { Recebimento } from '../../types/cobranca'
import type { CobrancaProjeto, StatusProjeto } from '../../types/projeto'
import { ROTULO_FORMA_PAGAMENTO, ROTULO_TIPO_COBRANCA } from '../../utils/cobrancas'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import SeloStatusCobranca from '../cobrancas/SeloStatusCobranca.vue'

const props = defineProps<{
  cobrancas: CobrancaProjeto[]
  statusProjeto: StatusProjeto
  construcaoCivil: boolean
  /** Os recebimentos (data do pagamento) foram carregados; sem a permissão de Cobranças mostra só o status das parcelas. */
  recebimentosDisponiveis: boolean
  recebimentosDaParcela: (parcelaId: number) => Recebimento[]
}>()

const totalParcelas = computed(() => props.cobrancas.reduce((total, cobranca) => total + cobranca.parcelas.length, 0))

const todasPagas = computed(
  () =>
    totalParcelas.value > 0 &&
    props.cobrancas.every((cobranca) => cobranca.parcelas.every((parcela) => parcela.status === 'PAGA')),
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

/** Data do último recebimento da parcela paga ("Pago no dia"); vazio sem permissão de Cobranças. */
function dataDoPagamento(parcelaId: number): string {
  const datas = props.recebimentosDaParcela(parcelaId).map((r) => r.dataRecebimento.slice(0, 10))
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
              <template v-if="parcela.status === 'PAGA' && dataDoPagamento(parcela.id)">
                Pago no dia: {{ dataDoPagamento(parcela.id) }}
              </template>
              <template v-else>
                Vencimento: {{ isoParaDataBr(parcela.vencimento) }}
              </template>
            </span>
          </div>
          <SeloStatusCobranca :status="parcela.status" />
          <span class="parcela-valor">{{ formatarMoeda(parcela.valor) }}</span>
        </li>
      </ul>
    </div>

    <p
      v-if="cobrancas.length > 0 && !recebimentosDisponiveis"
      class="pagamentos-nota"
    >
      Sem acesso a Cobranças: o dia do pagamento não é exibido, apenas o status de cada parcela.
    </p>
  </section>
</template>

<style scoped>
.pagamentos-titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.pagamentos-vazio,
.pagamentos-nota {
  margin: 0;
  padding: 12px 16px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  color: #6a7282;
  font-size: 13.5px;
}

.pagamentos-nota {
  margin-top: 8px;
  border-style: solid;
  font-size: 12.5px;
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
