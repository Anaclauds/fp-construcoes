<script setup lang="ts">
import { rotuloCompetencia } from '../../utils/caixa'

defineProps<{
  competencia: string
  podeVoltar: boolean
  podeAvancar: boolean
  /** Mostra o atalho "Ir para o mês atual" quando a tela está em outro mês. */
  foraDoMesAtual: boolean
}>()

defineEmits<{
  anterior: []
  proximo: []
  'mes-atual': []
}>()
</script>

<template>
  <div
    class="seletor"
    role="group"
    aria-label="Competência do caixa"
  >
    <button
      type="button"
      class="seta"
      aria-label="Mês anterior"
      :disabled="!podeVoltar"
      @click="$emit('anterior')"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
    <h2
      class="mes"
      aria-live="polite"
    >
      {{ rotuloCompetencia(competencia) }}
    </h2>
    <button
      type="button"
      class="seta"
      aria-label="Próximo mês"
      :disabled="!podeAvancar"
      @click="$emit('proximo')"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
      >
        <path d="M9 5l7 7-7 7" />
      </svg>
    </button>
    <button
      v-if="foraDoMesAtual"
      type="button"
      class="atalho"
      @click="$emit('mes-atual')"
    >
      Ir para o mês atual
    </button>
  </div>
</template>

<style scoped>
.seletor {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seta {
  width: 34px;
  height: 34px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: 1px solid var(--fp-cinza-borda);
  border-radius: 8px;
  background-color: #fff;
  color: var(--fp-texto-titulo-campo);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.seta svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.seta:hover:not(:disabled) {
  background-color: var(--fp-cinza-fundo);
}

.seta:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.seta:focus-visible,
.atalho:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.mes {
  min-width: 150px;
  margin: 0;
  color: var(--fp-texto-titulo-campo);
  font-size: 20px;
  font-weight: 600;
  text-align: center;
}

.atalho {
  margin-left: 6px;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--fp-verde);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
</style>
