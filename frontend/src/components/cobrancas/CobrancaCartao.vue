<script setup lang="ts">
import { computed } from 'vue'
import type { Cobranca } from '../../types'
import {
  ROTULO_STATUS_COBRANCA,
  ROTULO_TIPO_COBRANCA,
  cobrancaAceitaRecebimento,
  parcelaDeReferencia,
  percentualRecebido,
  descricaoCobranca,
} from '../../utils/cobrancas'
import { formatarMoeda, instanteParaDataBr, isoParaDataBr } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import SeloStatusCobranca from './SeloStatusCobranca.vue'

const props = defineProps<{
  cobranca: Cobranca
  /** Tem permissão para registrar recebimentos. */
  podeGerenciar: boolean
}>()

defineEmits<{
  detalhes: []
  receber: []
}>()

const progresso = computed(() => percentualRecebido(props.cobranca))
const referencia = computed(() => parcelaDeReferencia(props.cobranca))
const parcelada = computed(() => props.cobranca.parcelas.length > 1)
const aceitaRecebimento = computed(() => cobrancaAceitaRecebimento(props.cobranca))
// Cobrança cancelada não recebe nada: sem "Restante", barra nem percentual.
const cancelada = computed(() => props.cobranca.status === 'CANCELADO')

// Parcelada: o cartão mostra a parcela que vence a seguir; todas ficam no modal de detalhes.
const textoVencimento = computed(() => {
  if (!referencia.value) return ''
  const data = isoParaDataBr(referencia.value.vencimento)
  return parcelada.value
    ? `Vencimento em ${data} · Parcela ${referencia.value.numero} de ${props.cobranca.parcelas.length}`
    : `Vencimento em ${data}`
})
</script>

<template>
  <article
    class="cobranca"
    :aria-label="`Cobrança ${descricaoCobranca(cobranca.descricao)}`"
  >
    <div class="cobranca-topo">
      <div class="cobranca-info">
        <div class="cobranca-titulo">
          <span class="cobranca-tipo">{{ ROTULO_TIPO_COBRANCA[cobranca.tipo] }}</span>
          <SeloStatusCobranca
            :status="cobranca.status"
            :rotulo="ROTULO_STATUS_COBRANCA[cobranca.status]"
          />
        </div>
        <p class="cobranca-descricao">
          {{ descricaoCobranca(cobranca.descricao) }}
        </p>
        <p class="cobranca-apoio">
          Criada em {{ instanteParaDataBr(cobranca.criadaEm) }}
        </p>
        <p
          v-if="textoVencimento"
          class="cobranca-apoio"
        >
          {{ textoVencimento }}
        </p>
      </div>

      <div class="cobranca-valores">
        <p class="cobranca-valor">
          {{ formatarMoeda(cobranca.valorTotal) }}
        </p>
        <p
          v-if="!cancelada"
          class="cobranca-apoio"
        >
          Restante: {{ formatarMoeda(cobranca.valorRestante) }}
        </p>
      </div>
    </div>

    <div
      v-if="!cancelada"
      class="cobranca-progresso"
    >
      <div class="cobranca-progresso-rotulo">
        <span>Progresso</span>
        <span>{{ progresso }}%</span>
      </div>
      <div
        class="cobranca-barra"
        role="progressbar"
        aria-label="Progresso do recebimento"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progresso"
      >
        <div
          class="cobranca-barra-preenchida"
          :style="{ width: `${progresso}%` }"
        />
      </div>
    </div>

    <div class="cobranca-acoes">
      <BotaoFp
        v-if="podeGerenciar && aceitaRecebimento"
        tamanho="compacto"
        @click="$emit('receber')"
      >
        Registrar Recebimento
      </BotaoFp>
      <BotaoFp
        variante="secundario"
        tamanho="compacto"
        @click="$emit('detalhes')"
      >
        Ver Detalhes
      </BotaoFp>
    </div>
  </article>
</template>

<style scoped>
.cobranca {
  padding: 18px 20px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
}

.cobranca-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.cobranca-info {
  min-width: 0;
}

.cobranca-titulo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cobranca-tipo {
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 600;
}

.cobranca-descricao {
  margin: 4px 0 2px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.cobranca-apoio {
  margin: 0;
  color: #6a7282;
  font-size: 12px;
  line-height: 1.5;
}

.cobranca-valores {
  flex-shrink: 0;
  text-align: right;
}

.cobranca-valor {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.cobranca-progresso {
  margin-top: 14px;
}

.cobranca-progresso-rotulo {
  display: flex;
  justify-content: space-between;

  color: #6a7282;
  font-size: 12px;
}

.cobranca-barra {
  height: 6px;
  margin-top: 6px;
  border-radius: 999px;
  background-color: var(--fp-cinza-borda);
  overflow: hidden;
}

.cobranca-barra-preenchida {
  height: 100%;
  border-radius: 999px;
  background-color: var(--fp-verde);
  transition: width 0.3s ease;
}

.cobranca-acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

@media (max-width: 700px) {
  .cobranca-topo {
    flex-direction: column;
    gap: 8px;
  }

  .cobranca-valores {
    text-align: left;
  }
}
</style>
