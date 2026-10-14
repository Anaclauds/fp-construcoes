<script setup lang="ts">
import BotaoFp from '../ui/BotaoFp.vue'
</script>

<template>
  <!-- Atalho "Editar" do rodapé dos modais de visualização. -->
  <BotaoFp variante="link">
    <template #icone>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        class="icone-lapis"
      >
        <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
        <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 8 16l1.2-4z" />
      </svg>
    </template>
    Editar
  </BotaoFp>
</template>

<style scoped>
.icone-lapis {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
