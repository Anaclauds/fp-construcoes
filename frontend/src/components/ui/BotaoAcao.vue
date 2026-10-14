<script setup lang="ts">
import { computed } from 'vue'
import desativarIcon from '../../assets/icons/icone-desativar.svg'
import editarIcon from '../../assets/icons/icone-editar.svg'
import visualizarIcon from '../../assets/icons/icone-visualizar.svg'

export type TipoAcao = 'visualizar' | 'editar' | 'desativar' | 'reativar' | 'aprovar' | 'baixar'

const props = defineProps<{
  tipo: TipoAcao
  /** Nome do registro, usado no rótulo acessível ("Editar Maria Silva"). */
  alvo?: string
  /** Desativar com X preto e borda cinza (padrão de Funcionários) em vez de vermelho (Usuários). */
  discreto?: boolean
}>()

const verbo: Record<TipoAcao, string> = {
  visualizar: 'Visualizar',
  editar: 'Editar',
  desativar: 'Desativar',
  reativar: 'Reativar',
  aprovar: 'Aprovar',
  baixar: 'Baixar PDF',
}

const rotulo = computed(() => (props.alvo ? `${verbo[props.tipo]} ${props.alvo}` : verbo[props.tipo]))
</script>

<template>
  <button
    type="button"
    class="botao-acao"
    :class="[`botao-acao--${tipo}`, { 'botao-acao--discreto': discreto }]"
    :aria-label="rotulo"
    :title="verbo[tipo]"
  >
    <img
      v-if="tipo === 'visualizar'"
      :src="visualizarIcon"
      alt=""
      width="14"
      height="14"
    >
    <img
      v-else-if="tipo === 'editar'"
      :src="editarIcon"
      alt=""
      width="14"
      height="14"
    >
    <img
      v-else-if="tipo === 'desativar'"
      :src="desativarIcon"
      alt=""
      width="18"
      height="18"
      class="botao-acao-x"
    >
    <svg
      v-else-if="tipo === 'baixar'"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      class="botao-acao-baixar"
    >
      <path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15" />
    </svg>
    <svg
      v-else
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M3 8.5l3.2 3.2L13 4.5"
        fill="none"
        stroke="#fff"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<style scoped>
.botao-acao {
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

.botao-acao:hover {
  background-color: var(--fp-cinza-fundo);
}

.botao-acao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.botao-acao--desativar {
  border-color: var(--fp-vermelho);
}

.botao-acao--desativar:hover {
  background-color: #fef2f2;
}

/* Variante discreta: X preto com borda cinza. */
.botao-acao--discreto {
  border-color: var(--fp-cinza-borda);
}

.botao-acao--discreto .botao-acao-x {
  filter: brightness(0);
}

.botao-acao-baixar {
  fill: none;
  stroke: #666;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Aprovar e reativar: botão verde sólido com ✓ branco. */
.botao-acao--aprovar,
.botao-acao--aprovar:hover,
.botao-acao--reativar,
.botao-acao--reativar:hover {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde);
}

.botao-acao--aprovar:hover,
.botao-acao--reativar:hover {
  filter: brightness(1.12);
}

.botao-acao:disabled,
.botao-acao:disabled:hover {
  opacity: 0.45;
  cursor: not-allowed;
  filter: none;
}
</style>
