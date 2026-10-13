<script lang="ts">
import type { StatusCadastro } from '../../types'

export type FiltroStatus = 'TODOS' | StatusCadastro

export interface OpcaoFiltro<T extends string = string> {
  valor: T
  rotulo: string
}

const OPCOES_CADASTRO: OpcaoFiltro<FiltroStatus>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'ATIVO', rotulo: 'Ativo' },
  { valor: 'INATIVO', rotulo: 'Inativo' },
]
</script>

<script setup lang="ts" generic="V extends string = FiltroStatus">
import { computed, useId } from 'vue'
import buscaIcon from '../../assets/icons/icone-busca.svg'

const props = defineProps<{
  placeholder?: string
  /** Chips do filtro; sem valor, usa Todos / Ativo / Inativo. O primeiro deve ser o valor "sem filtro". */
  opcoes?: OpcaoFiltro<V>[]
  /** Rótulo do grupo de chips. */
  rotuloFiltro?: string
}>()

const busca = defineModel<string>('busca', { default: '' })
const status = defineModel<V>('status', { required: true })

const idBusca = useId()

const chips = computed(() => props.opcoes ?? (OPCOES_CADASTRO as OpcaoFiltro<string>[] as OpcaoFiltro<V>[]))
</script>

<template>
  <section
    class="card-busca"
    aria-label="Busca e filtros"
  >
    <div class="card-busca-campo">
      <label
        :for="idBusca"
        class="fp-sr-only"
      >Buscar</label>
      <img
        :src="buscaIcon"
        alt=""
        width="14"
        height="14"
        class="card-busca-lupa"
      >
      <input
        :id="idBusca"
        v-model="busca"
        type="search"
        autocomplete="off"
        :placeholder="placeholder ?? 'Buscar...'"
      >
    </div>

    <div
      class="card-busca-status"
      role="group"
      aria-label="Filtrar por status"
    >
      <span
        class="card-busca-status-rotulo"
        aria-hidden="true"
      >{{ rotuloFiltro ?? 'Status:' }}</span>
      <button
        v-for="opcao in chips"
        :key="opcao.valor"
        type="button"
        class="chip"
        :class="{ 'chip--ativo': status === opcao.valor }"
        :aria-pressed="status === opcao.valor"
        @click="status = opcao.valor"
      >
        {{ opcao.rotulo }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.card-busca {
  min-height: 68px;

  display: flex;
  align-items: center;
  gap: 24px;

  padding: 14px 16px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
}

.card-busca-campo {
  flex: 1;
  min-width: 0;
  position: relative;
}

.card-busca-lupa {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

input {
  width: 100%;
  height: 38px;

  padding: 0 12px 0 36px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: #fff;

  color: #333;
  font-family: inherit;
  font-size: 13px;
}

input::placeholder {
  color: #9ca3af;
}

input:focus {
  outline: none;
  border-color: var(--fp-verde);
  box-shadow: var(--fp-foco);
}

.card-busca-status {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-end;
}

.card-busca-status-rotulo {
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

@media (max-width: 700px) {
  .card-busca {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
