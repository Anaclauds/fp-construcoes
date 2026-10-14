<script setup lang="ts">
import { computed } from 'vue'
import type { TipoCliente } from '../../types'

const props = defineProps<{
  /** null = cadastro rápido (ainda sem tipo). */
  tipo: TipoCliente | null
}>()

const variante = computed(() => (props.tipo === null ? 'rapido' : props.tipo === 'PF' ? 'pf' : 'pj'))
</script>

<template>
  <span
    class="selo-tipo"
    :class="`selo-tipo--${variante}`"
    :title="tipo === null ? 'Cadastro rápido: faltam dados para completar o cadastro' : undefined"
  >{{ tipo ?? 'Rápido' }}</span>
</template>

<style scoped>
.selo-tipo {
  display: inline-block;
  padding: 3px 12px;
  border: 1px solid;
  border-radius: 999px;

  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.selo-tipo--pf {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.selo-tipo--pj {
  background-color: #f3e8ff;
  border-color: #d8b4fe;
  color: #7e22ce;
}

.selo-tipo--rapido {
  background-color: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}
</style>
