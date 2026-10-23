<script setup lang="ts">
import type { SituacaoCaixa } from '../../types/caixa'
import { ROTULO_SITUACAO_CAIXA } from '../../utils/caixa'

defineProps<{ situacao: SituacaoCaixa }>()
</script>

<template>
  <span
    class="selo-caixa"
    :class="`selo-caixa--${situacao.toLowerCase()}`"
  >
    <span
      class="selo-caixa-ponto"
      aria-hidden="true"
    />
    {{ ROTULO_SITUACAO_CAIXA[situacao] }}
  </span>
</template>

<style scoped>
.selo-caixa {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 4px 12px;
  border: 1px solid var(--sc-borda);
  border-radius: 999px;
  background-color: var(--sc-fundo);

  color: var(--sc-texto);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.selo-caixa-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.selo-caixa--em_andamento {
  --sc-fundo: #dcfce7;
  --sc-borda: #86efac;
  --sc-texto: #008236;
}

.selo-caixa--pendente_fechamento {
  --sc-fundo: #fef3c7;
  --sc-borda: #fcd34d;
  --sc-texto: #b45309;
}

.selo-caixa--fechado,
.selo-caixa--nao_aberto {
  --sc-fundo: #f3f4f6;
  --sc-borda: #d1d5db;
  --sc-texto: #6b7280;
}
</style>
