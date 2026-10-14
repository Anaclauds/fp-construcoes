<script setup lang="ts">
import type { SituacaoCaixa } from '../../types/caixa'
import SeloSituacaoCaixa from './SeloSituacaoCaixa.vue'

defineProps<{
  subtitulo: string
  /** Situação do mês exibido; o selo fica ao lado do título (Figma). */
  situacao: SituacaoCaixa | null
}>()
</script>

<template>
  <!-- Mesmo cabeçalho de CabecalhoPagina, com o selo de situação ao lado do título como no Figma. -->
  <header class="cabecalho-caixa">
    <div class="cabecalho-caixa-titulo">
      <h1>Caixa</h1>
      <SeloSituacaoCaixa
        v-if="situacao"
        :situacao="situacao"
      />
    </div>
    <p>{{ subtitulo }}</p>
  </header>
</template>

<style scoped>
.cabecalho-caixa-titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 14px;
}

h1 {
  margin: 0;
  color: var(--fp-verde);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.15;
}

p {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 900px) {
  h1 {
    font-size: 28px;
  }
}
</style>
