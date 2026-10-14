<script setup lang="ts">
import type { TipoCliente } from '../../types'
import { ROTULO_TIPO } from '../../utils/opcoes-cliente'

defineProps<{ modelValue: TipoCliente | '' }>()
const emit = defineEmits<{ 'update:modelValue': [tipo: TipoCliente] }>()

const TIPOS: TipoCliente[] = ['PF', 'PJ']
</script>

<template>
  <!-- Alternância "Pessoa Física | Pessoa Jurídica" do topo do cadastro. -->
  <div
    class="seletor-tipo"
    role="radiogroup"
    aria-label="Tipo de cliente"
  >
    <button
      v-for="tipo in TIPOS"
      :key="tipo"
      type="button"
      role="radio"
      class="seletor-tipo-opcao"
      :class="{ 'seletor-tipo-opcao--ativa': modelValue === tipo }"
      :aria-checked="modelValue === tipo"
      @click="emit('update:modelValue', tipo)"
    >
      {{ ROTULO_TIPO[tipo] }}
    </button>
  </div>
</template>

<style scoped>
.seletor-tipo {
  display: flex;
  gap: 8px;
}

.seletor-tipo-opcao {
  height: 50px;
  padding: 0 31px;
  border: 1.2px solid var(--fp-verde-30);
  border-radius: 10px;
  background-color: #fff;

  color: var(--fp-verde);
  font-family: inherit;
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.seletor-tipo-opcao:hover:not(.seletor-tipo-opcao--ativa) {
  background-color: var(--fp-verde-10);
}

.seletor-tipo-opcao--ativa {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde);
  color: #fff;
}

.seletor-tipo-opcao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}
</style>
