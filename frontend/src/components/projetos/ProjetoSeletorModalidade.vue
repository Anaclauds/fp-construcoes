<script setup lang="ts">
import { useId } from 'vue'
import type { ModalidadeCobrancaProjeto } from '../../types/projeto'

const modalidade = defineModel<ModalidadeCobrancaProjeto>({ required: true })

const idRotulo = useId()

const opcoes: { valor: ModalidadeCobrancaProjeto; rotulo: string }[] = [
  { valor: 'A_VISTA', rotulo: 'À Vista' },
  { valor: 'PARCELADO_AUTOMATICO', rotulo: 'Parcelado' },
]
</script>

<template>
  <div class="seletor">
    <span
      :id="idRotulo"
      class="seletor-rotulo"
    >Tipo de cobrança</span>
    <div
      class="seletor-opcoes"
      role="radiogroup"
      :aria-labelledby="idRotulo"
    >
      <button
        v-for="opcao in opcoes"
        :key="opcao.valor"
        type="button"
        role="radio"
        class="seletor-opcao"
        :class="{ 'seletor-opcao--ativa': modalidade === opcao.valor }"
        :aria-checked="modalidade === opcao.valor"
        @click="modalidade = opcao.valor"
      >
        {{ opcao.rotulo }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.seletor {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.seletor-rotulo {
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
}

/* Figma: duas opções lado a lado, 44px de altura, 16px de espaço entre elas. */
.seletor-opcoes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.seletor-opcao {
  height: 44px;
  padding: 0 16px;
  border: 1.2px solid var(--fp-verde-30);
  border-radius: 9px;
  background-color: #fff;

  color: #555;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.seletor-opcao:hover:not(.seletor-opcao--ativa) {
  background-color: var(--fp-verde-10);
}

.seletor-opcao--ativa {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde);
  color: #fff;
  font-weight: 600;
}

.seletor-opcao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}
</style>
