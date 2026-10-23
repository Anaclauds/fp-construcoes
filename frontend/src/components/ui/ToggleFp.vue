<script setup lang="ts">
defineProps<{
  /** Rótulo para leitores de tela (ex.: "Visualizar Usuário"). */
  rotulo: string
  desabilitado?: boolean
}>()

const ligado = defineModel<boolean>({ default: false })
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle"
    :class="{ 'toggle--ligado': ligado }"
    :aria-checked="ligado"
    :aria-label="rotulo"
    :disabled="desabilitado"
    @click="ligado = !ligado"
  >
    <span
      class="toggle-bolinha"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped>
.toggle {
  position: relative;
  width: 37px;
  height: 21px;
  flex-shrink: 0;

  padding: 0;
  border: 0;
  border-radius: 999px;
  background-color: #cbced4;

  cursor: pointer;
  transition: background-color 0.15s ease;
}

.toggle--ligado {
  background-color: var(--fp-verde);
}

.toggle-bolinha {
  position: absolute;
  top: 1.25px;
  left: 1.25px;
  width: 18.5px;
  height: 18.5px;

  border-radius: 50%;
  background-color: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease;
}

.toggle--ligado .toggle-bolinha {
  transform: translateX(16px);
}

.toggle:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

/* Celular: área de toque de 41px de altura (WCAG/Material ≥ 40px) sem mudar o desenho do switch. */
@media (max-width: 575px) {
  .toggle::after {
    content: '';
    position: absolute;
    inset: -10px -6px;
  }
}

/* Somente leitura: mantém as cores do Figma, só tira o cursor de clique. */
.toggle:disabled {
  cursor: default;
}
</style>
