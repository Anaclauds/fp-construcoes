<script setup lang="ts">
import type { StatusFrequencia } from '../../types'
import { ROTULO_BOTAO_STATUS, ROTULO_STATUS, STATUS_FREQUENCIA, classeStatus } from '../../utils/frequencia'

defineProps<{
  /** Quem está sendo marcado, para o rótulo acessível ("Frequência de Maria Silva"). */
  alvo: string
  /** Mostra o status sem permitir alterá-lo (tela de consulta). */
  somenteLeitura?: boolean
}>()

// null = ainda sem registro: nenhum botão marcado.
const status = defineModel<StatusFrequencia | null>({ default: null })
</script>

<template>
  <div
    class="controle-status"
    role="group"
    :aria-label="`Frequência de ${alvo}`"
  >
    <button
      v-for="opcao in STATUS_FREQUENCIA"
      :key="opcao"
      type="button"
      class="controle-status-botao"
      :class="[classeStatus(opcao), { 'controle-status-botao--marcado': status === opcao }]"
      :aria-pressed="status === opcao"
      :aria-label="ROTULO_STATUS[opcao]"
      :title="ROTULO_STATUS[opcao]"
      :disabled="somenteLeitura"
      @click="status = opcao"
    >
      <span
        class="controle-status-ponto"
        aria-hidden="true"
      />
      {{ ROTULO_BOTAO_STATUS[opcao] }}
    </button>
  </div>
</template>

<style scoped>
.controle-status {
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
}

.controle-status-botao {
  height: 28px;

  display: inline-flex;
  align-items: center;
  gap: 5px;

  padding: 0 8px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 8px;
  background-color: #fff;

  color: #666;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.controle-status-ponto {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #d1d5db;
}

.controle-status-botao:hover:not(:disabled):not(.controle-status-botao--marcado) {
  border-color: var(--st-borda);
  background-color: var(--st-fundo);
}

.controle-status-botao:hover:not(:disabled):not(.controle-status-botao--marcado) .controle-status-ponto {
  background-color: var(--st-texto);
}

.controle-status-botao--marcado {
  border-color: var(--st-borda);
  background-color: var(--st-fundo);
  color: var(--st-texto);
  font-weight: 600;
}

.controle-status-botao--marcado .controle-status-ponto {
  background-color: var(--st-texto);
}

.controle-status-botao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

/* Consulta: botões só informam; os não marcados ficam em segundo plano. */
.controle-status-botao:disabled {
  cursor: default;
}

.controle-status-botao:disabled:not(.controle-status-botao--marcado) {
  opacity: 0.5;
}
</style>
