<script lang="ts">
export interface OpcaoChip<T extends string = string> {
  valor: T
  rotulo: string
}
</script>

<script setup lang="ts" generic="V extends string">
defineProps<{
  /** Texto à esquerda dos chips, ex.: "Status:". */
  rotulo: string
  opcoes: OpcaoChip<V>[]
}>()

const selecionado = defineModel<V>({ required: true })
</script>

<template>
  <div
    class="grupo-chips"
    role="group"
    :aria-label="`Filtrar por ${rotulo.replace(/:$/, '').toLowerCase()}`"
  >
    <span
      class="grupo-chips-rotulo"
      aria-hidden="true"
    >{{ rotulo }}</span>
    <button
      v-for="opcao in opcoes"
      :key="opcao.valor"
      type="button"
      class="chip"
      :class="{ 'chip--ativo': selecionado === opcao.valor }"
      :aria-pressed="selecionado === opcao.valor"
      @click="selecionado = opcao.valor"
    >
      {{ opcao.rotulo }}
    </button>
  </div>
</template>

<style scoped>
.grupo-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.grupo-chips-rotulo {
  margin-right: 2px;
  color: #6b7280;
  font-size: 12px;
}

.chip {
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background-color: #f5f5f5;

  color: #666;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.chip:hover:not(.chip--ativo) {
  background-color: #ececec;
}

.chip--ativo {
  background-color: var(--fp-verde);
  color: #fff;
}

.chip:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}
</style>
