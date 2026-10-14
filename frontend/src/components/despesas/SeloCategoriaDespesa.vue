<script setup lang="ts">
import { computed } from 'vue'
import type { CategoriaDespesa } from '../../types/despesa'
import { rotuloCategoriaDespesa } from '../../utils/despesas'

/** Selo da categoria (Figma: `CategoriaBadge`). Despesa sem categoria aparece em cinza. */
const props = defineProps<{ categoria: CategoriaDespesa | null }>()

const classe = computed(() => `selo-categoria--${(props.categoria ?? 'NENHUMA').toLowerCase().replace(/_/g, '-')}`)
</script>

<template>
  <span
    class="selo-categoria"
    :class="classe"
  >
    <span
      class="selo-categoria-ponto"
      aria-hidden="true"
    />
    {{ rotuloCategoriaDespesa(categoria) }}
  </span>
</template>

<style scoped>
.selo-categoria {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  max-width: 100%;
  padding: 3px 12px;
  border: 1px solid var(--sc-borda);
  border-radius: 999px;
  background-color: var(--sc-fundo);

  color: var(--sc-texto);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.selo-categoria-ponto {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: currentColor;
}

.selo-categoria--compra-material {
  --sc-fundo: #dbeafe;
  --sc-borda: #93c5fd;
  --sc-texto: #1d4ed8;
}

.selo-categoria--combustivel {
  --sc-fundo: #fef3c7;
  --sc-borda: #fcd34d;
  --sc-texto: #b45309;
}

.selo-categoria--ferramenta {
  --sc-fundo: #ede9fe;
  --sc-borda: #c4b5fd;
  --sc-texto: #6d28d9;
}

.selo-categoria--manutencao {
  --sc-fundo: #ffedd5;
  --sc-borda: #fdba74;
  --sc-texto: #c2410c;
}

.selo-categoria--alimentacao {
  --sc-fundo: #dcfce7;
  --sc-borda: #86efac;
  --sc-texto: #008236;
}

.selo-categoria--mao-de-obra {
  --sc-fundo: #ccfbf1;
  --sc-borda: #5eead4;
  --sc-texto: #0f766e;
}

.selo-categoria--aluguel {
  --sc-fundo: #fce7f3;
  --sc-borda: #f9a8d4;
  --sc-texto: #be185d;
}

.selo-categoria--outros,
.selo-categoria--nenhuma {
  --sc-fundo: #f3f4f6;
  --sc-borda: #d1d5db;
  --sc-texto: #6b7280;
}
</style>
