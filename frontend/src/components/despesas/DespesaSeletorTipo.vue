<script setup lang="ts">
import { useId } from 'vue'
import type { TipoDespesa } from '../../types/despesa'

defineProps<{
  desabilitado?: boolean
}>()

const tipo = defineModel<TipoDespesa>({ required: true })

const nome = useId()

const OPCOES: { valor: TipoDespesa; rotulo: string; apoio: string }[] = [
  { valor: 'DIVERSA', rotulo: 'Despesa Diversa', apoio: 'Combustível, ferramenta, manutenção...' },
  { valor: 'COMPRA_MATERIAL', rotulo: 'Compra de Material', apoio: 'Entra no estoque e sai do caixa' },
]
</script>

<template>
  <fieldset
    class="tipo"
    :disabled="desabilitado"
  >
    <legend class="tipo-legenda">
      Tipo de despesa
    </legend>
    <div class="tipo-opcoes">
      <label
        v-for="opcao in OPCOES"
        :key="opcao.valor"
        class="tipo-opcao"
        :class="{ 'tipo-opcao--ativa': tipo === opcao.valor }"
      >
        <input
          v-model="tipo"
          type="radio"
          class="fp-sr-only"
          :name="nome"
          :value="opcao.valor"
        >
        <span class="tipo-rotulo">{{ opcao.rotulo }}</span>
        <span class="tipo-apoio">{{ opcao.apoio }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.tipo {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.tipo-legenda {
  padding: 0;
  margin-bottom: 6px;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
}

.tipo-opcoes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.tipo-opcao {
  display: flex;
  flex-direction: column;
  gap: 2px;

  padding: 10px 14px;
  border: 1.2px solid var(--fp-verde-30);
  border-radius: 9px;
  background-color: #fff;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.tipo-opcao:hover {
  background-color: var(--fp-verde-10);
}

.tipo-opcao--ativa {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde-10);
  box-shadow: inset 0 0 0 1px var(--fp-verde);
}

.tipo-opcao:has(input:focus-visible) {
  box-shadow: var(--fp-foco);
}

.tipo-opcao:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.6;
}

.tipo-rotulo {
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 600;
}

.tipo-apoio {
  color: #717182;
  font-size: 12px;
}

@media (max-width: 520px) {
  .tipo-opcoes {
    grid-template-columns: 1fr;
  }
}
</style>
