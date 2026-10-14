<script setup lang="ts">
defineProps<{ rotulo: string }>()
</script>

<template>
  <!-- "+ Adicionar Material / Serviço": botão de contorno verde. -->
  <button
    type="button"
    class="adicionar"
  >
    <span
      class="adicionar-mais"
      aria-hidden="true"
    >+</span>
    {{ rotulo }}
  </button>
</template>

<style scoped>
.adicionar {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 0 24px;
  border: 1.5px solid var(--fp-verde);
  border-radius: 9px;
  background-color: #fff;

  color: var(--fp-verde);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.adicionar:hover {
  background-color: var(--fp-verde-10);
}

.adicionar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.adicionar-mais {
  font-size: 18px;
  line-height: 1;
}
</style>
