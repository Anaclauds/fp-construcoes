<script setup lang="ts">
import type { StatusCadastro } from '../../types'

defineProps<{ status: StatusCadastro }>()
</script>

<template>
  <span
    class="selo-status"
    :class="status === 'ATIVO' ? 'selo-status--ativo' : 'selo-status--inativo'"
  >
    <span
      class="selo-status-ponto"
      aria-hidden="true"
    />
    {{ status === 'ATIVO' ? 'Ativo' : 'Inativo' }}
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
}

.selo-status-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.selo-status--ativo {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #008236;
}

.selo-status--inativo {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: var(--fp-vermelho-escuro);
}
</style>
