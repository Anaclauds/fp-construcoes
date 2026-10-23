<script setup lang="ts">
import { LIMITE_VALOR_CENTAVOS, centavosParaMoeda } from '../../utils/orcamentos'

const props = defineProps<{
  /** Valores em centavos, calculados como o backend (ver `calcularResumo`). */
  materiais: number
  servicos: number
  total: number
  /** Desconto do orçamento em centavos; a linha só aparece quando for maior que zero. */
  desconto?: number
  /** A prévia está sendo confirmada pelo servidor (valores locais já aparecem enquanto isso). */
  calculando?: boolean
  /** O total (ou algum item) passa do limite permitido: em vez do número enorme mostra "Acima do limite". */
  acimaDoLimite?: boolean
}>()

const TEXTO_ACIMA = 'Acima do limite'

/** Valor da linha em reais, ou o aviso quando passa do limite (o total mostra o aviso sempre que o resumo passa). */
function texto(centavos: number, ehTotal = false): string {
  return centavos > LIMITE_VALOR_CENTAVOS || (ehTotal && props.acimaDoLimite) ? TEXTO_ACIMA : centavosParaMoeda(centavos)
}
</script>

<template>
  <section
    class="resumo"
    aria-labelledby="orc-resumo"
  >
    <h3
      id="orc-resumo"
      class="resumo-titulo"
    >
      Resumo
    </h3>

    <dl class="resumo-card">
      <div class="resumo-linha">
        <dt>Materiais:</dt>
        <dd>{{ texto(materiais) }}</dd>
      </div>
      <div class="resumo-linha">
        <dt>Serviços:</dt>
        <dd>{{ texto(servicos) }}</dd>
      </div>
      <div
        v-if="desconto && desconto > 0"
        class="resumo-linha"
      >
        <dt>Desconto:</dt>
        <dd>− {{ centavosParaMoeda(desconto) }}</dd>
      </div>
      <div class="resumo-linha resumo-linha--total">
        <dt>TOTAL:</dt>
        <dd
          aria-live="polite"
          :class="{ 'resumo-acima': total > LIMITE_VALOR_CENTAVOS || acimaDoLimite }"
        >
          {{ texto(total, true) }}
        </dd>
      </div>
    </dl>
    <p
      v-if="calculando"
      class="resumo-calculando"
      role="status"
    >
      Calculando valores...
    </p>
  </section>
</template>

<style scoped>
.resumo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resumo-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: var(--orc-titulo-secao, 22px);
  font-weight: 500;
}

.resumo-card {
  width: 100%;
  max-width: 450px;
  margin: 0;
  padding: 22px 24px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.resumo-calculando {
  margin: 0;
  color: #717182;
  font-size: 13px;
}

.resumo-linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;

  color: #333;
  font-size: 16px;
}

.resumo-linha dd {
  margin: 0;
  font-weight: 500;
}

.resumo-linha--total {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--fp-verde-30);
}

.resumo-linha--total dt {
  font-size: 20px;
  font-weight: 700;
}

.resumo-linha--total dd.resumo-acima {
  color: var(--fp-vermelho-escuro);
  font-size: 18px;
}

.resumo-linha--total dd {
  color: var(--fp-verde);
  font-size: 24px;
  font-weight: 700;
}
</style>
