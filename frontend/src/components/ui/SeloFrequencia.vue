<script setup lang="ts">
import type { StatusFrequencia } from '../../types'
import { classeStatus, rotuloStatus } from '../../utils/frequencia'

defineProps<{
  /** null = sem registro no dia ("Não registrado"). */
  status: StatusFrequencia | null
}>()
</script>

<template>
  <span
    class="selo-frequencia"
    :class="classeStatus(status)"
  >
    <span
      class="selo-frequencia-ponto"
      aria-hidden="true"
    />
    {{ rotuloStatus(status) }}
  </span>
</template>

<style scoped>
.selo-frequencia {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 3px 12px;
  border: 1px solid var(--st-borda);
  border-radius: 999px;
  background-color: var(--st-fundo);

  color: var(--st-texto);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
}

.selo-frequencia-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}
</style>
