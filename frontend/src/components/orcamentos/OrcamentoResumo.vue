<script setup lang="ts">
import { centavosParaMoeda } from '../../utils/orcamentos'

defineProps<{
  /** Valores em centavos, calculados como o backend (ver `calcularResumo`). */
  materiais: number
  servicos: number
  total: number
}>()
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
        <dd>{{ centavosParaMoeda(materiais) }}</dd>
      </div>
      <div class="resumo-linha">
        <dt>Serviços:</dt>
        <dd>{{ centavosParaMoeda(servicos) }}</dd>
      </div>
      <div class="resumo-linha resumo-linha--total">
        <dt>TOTAL:</dt>
        <dd aria-live="polite">
          {{ centavosParaMoeda(total) }}
        </dd>
      </div>
    </dl>
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

.resumo-linha--total dd {
  color: var(--fp-verde);
  font-size: 24px;
  font-weight: 700;
}
</style>
