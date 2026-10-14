<script setup lang="ts">
import type { StatusOrcamento } from '../../types'
import { ROTULO_STATUS_ORCAMENTO } from '../../utils/orcamentos'

defineProps<{ status: StatusOrcamento }>()
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
    {{ ROTULO_STATUS_ORCAMENTO[status] }}
  </span>
</template>

<style scoped>
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

.selo-status--pendente {
  background-color: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

.selo-status--em-analise {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.selo-status--aprovado {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #008236;
}

.selo-status--reprovado {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.selo-status--cancelado {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #6b7280;
}
</style>
