<script setup lang="ts">
import type { StatusProjeto } from '../../types/projeto'
import { ROTULO_STATUS_PROJETO } from '../../utils/projetos'

defineProps<{ status: StatusProjeto }>()
</script>

<template>
  <span
    class="selo-status"
    :class="`selo-status--${status.toLowerCase().replace('_', '-')}`"
  >
    <span
      class="selo-status-ponto"
      aria-hidden="true"
    />
    {{ ROTULO_STATUS_PROJETO[status] }}
  </span>
</template>

<style scoped>
/* Mesma forma do selo de status das outras telas (pílula com ponto de 6px); cores por situação. */
.selo-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 3px 12px;
  border: 1px solid;
  border-radius: 999px;

  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.selo-status-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.selo-status--planejado {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.selo-status--em-execucao {
  background-color: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

.selo-status--concluido {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #008236;
}

.selo-status--cancelado {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
</style>
