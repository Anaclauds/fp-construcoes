<script setup lang="ts">
defineProps<{
  rotulo: string
  valor: string
}>()
</script>

<template>
  <div class="campo-leitura">
    <dt>{{ rotulo }}</dt>
    <dd>{{ valor || '—' }}</dd>
  </div>
</template>

<style scoped>
/* Caixa readonly dos modais de visualização. */
.campo-leitura {
  min-width: 0;

  padding: 12px 16px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

dd {
  margin: 0;
  color: #333;
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
</style>
