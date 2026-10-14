<script setup lang="ts">
import type { IndicadoresDespesas } from '../../types/despesa'
import { formatarMoeda } from '../../utils/formatadores'

defineProps<{
  indicadores: IndicadoresDespesas | null
  /** Há filtros ativos: os totais valem só para o que está filtrado. */
  filtrada: boolean
}>()
</script>

<template>
  <!-- Fora do Figma: totais da lista (a API já os devolve com os filtros aplicados). -->
  <dl
    class="resumo"
    :aria-label="filtrada ? 'Totais das despesas filtradas' : 'Totais das despesas'"
  >
    <div class="resumo-item">
      <dt>{{ filtrada ? 'Total filtrado' : 'Total das despesas' }}</dt>
      <dd>{{ indicadores ? formatarMoeda(indicadores.totalDespesas) : '—' }}</dd>
    </div>
    <div class="resumo-item">
      <dt>Compras de materiais</dt>
      <dd>{{ indicadores ? formatarMoeda(indicadores.totalComprasMateriais) : '—' }}</dd>
    </div>
    <div class="resumo-item">
      <dt>Outras despesas</dt>
      <dd>{{ indicadores ? formatarMoeda(indicadores.totalOutrasDespesas) : '—' }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.resumo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin: 0;
  padding: 0 4px;
}

.resumo-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.resumo-item dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.resumo-item dd {
  margin: 0;
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 600;
}
</style>
