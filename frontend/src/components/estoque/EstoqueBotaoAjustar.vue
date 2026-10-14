<script setup lang="ts">
defineProps<{
  /** Nome do material, usado no rótulo acessível ("Ajustar estoque de Tubo 20x20"). */
  alvo: string
}>()
</script>

<template>
  <!-- Mesmo visual dos botões de ação da linha (32x32, borda cinza); o ícone são duas setas, de entrada e saída. -->
  <button
    type="button"
    class="botao-ajustar"
    :aria-label="`Ajustar estoque de ${alvo}`"
    title="Ajustar estoque"
  >
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      aria-hidden="true"
    >
      <path d="M7 4v14M3.5 14.5 7 18l3.5-3.5" />
      <path d="M17 20V6M13.5 9.5 17 6l3.5 3.5" />
    </svg>
  </button>
</template>

<style scoped>
.botao-ajustar {
  width: 32px;
  height: 32px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: #fff;

  cursor: pointer;
  transition: background-color 0.15s ease;
}

.botao-ajustar:hover {
  background-color: var(--fp-cinza-fundo);
}

.botao-ajustar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

svg {
  fill: none;
  stroke: #333;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
