<script setup lang="ts">
import type { TipoOrcamento } from '../../types'
import { rotuloTipoOrcamento } from '../../utils/orcamentos'

defineProps<{ tipo: TipoOrcamento }>()
</script>

<template>
  <span class="selo-tipo">{{ rotuloTipoOrcamento(tipo) }}</span>
</template>

<style scoped>
/* Figma (TipoBadge): pílula pequena e neutra ao lado/abaixo do título. */
.selo-tipo {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid var(--fp-verde-30);
  border-radius: 999px;
  background-color: var(--fp-verde-10);

  color: var(--fp-verde);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}
</style>
