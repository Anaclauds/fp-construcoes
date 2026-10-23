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
import selectIcon from '../../assets/icons/icone-select.svg'
import GrupoChips from './GrupoChips.vue'

const props = defineProps<{
  placeholder?: string
  /** Chips do filtro; sem valor, usa Todos / Ativo / Inativo. O primeiro deve ser o valor "sem filtro". */
  opcoes?: OpcaoFiltro<V>[]
  /** Rótulo do grupo de chips (ou da lista suspensa). */
  rotuloFiltro?: string
  /** Mostra as opções numa lista suspensa em vez de chips: para filtros com muitas opções (ex.: categorias cadastradas). */
  filtroEmLista?: boolean
  /** Texto de apoio abaixo da lista suspensa (só com `filtroEmLista`). */
  apoioFiltro?: string
}>()

const busca = defineModel<string>('busca', { default: '' })
const status = defineModel<V>('status', { required: true })

const idBusca = useId()
const idFiltro = useId()
const idApoio = useId()

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

    <div class="card-busca-filtros">
      <div
        v-if="filtroEmLista"
        class="filtro-lista"
      >
        <label
          :for="idFiltro"
          class="filtro-lista-rotulo"
        >{{ rotuloFiltro ?? 'Status:' }}</label>
        <div class="filtro-lista-controle">
          <select
            :id="idFiltro"
            v-model="status"
            :aria-describedby="apoioFiltro ? idApoio : undefined"
          >
            <option
              v-for="opcao in chips"
              :key="opcao.valor"
              :value="opcao.valor"
            >
              {{ opcao.rotulo }}
            </option>
          </select>
          <img
            :src="selectIcon"
            alt=""
            width="16"
            height="16"
            class="filtro-lista-seta"
          >
        </div>
        <p
          v-if="apoioFiltro"
          :id="idApoio"
          class="filtro-lista-apoio"
        >
          {{ apoioFiltro }}
        </p>
      </div>
      <GrupoChips
        v-else
        v-model="status"
        :rotulo="rotuloFiltro ?? 'Status:'"
        :opcoes="chips"
      />
      <!-- Segundo filtro opcional (ex.: Tipo + Status em Clientes). -->
      <slot name="filtros-extra" />
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

.card-busca-filtros {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 24px;
}

/* Filtro em lista suspensa: rótulo ao lado do campo; no celular o campo ocupa a largura toda. */
.filtro-lista {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;
}

.filtro-lista-rotulo {
  color: #6b7280;
  font-size: 12px;
}

.filtro-lista-controle {
  position: relative;
  min-width: 0;
  flex: 0 1 240px;
}

.filtro-lista select {
  width: 100%;
  height: 38px;
  padding: 0 34px 0 12px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 6px;
  background-color: #fff;
  appearance: none;
  text-overflow: ellipsis;

  color: #333;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.filtro-lista select:focus {
  outline: none;
  border-color: var(--fp-verde);
  box-shadow: var(--fp-foco);
}

.filtro-lista-seta {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.filtro-lista-apoio {
  flex-basis: 100%;
  margin: 0;
  color: #717182;
  font-size: 11.5px;
  text-align: right;
}

@media (max-width: 700px) {
  .filtro-lista {
    flex: 1 1 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .filtro-lista-controle {
    flex-basis: auto;
  }

  .filtro-lista-apoio {
    text-align: left;
  }

  .card-busca {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  /* Em coluna o flex-basis das telas (ex.: 280px) viraria ALTURA do campo e a lupa ficaria solta; aqui só a altura natural vale. */
  .card-busca .card-busca-campo {
    flex: 0 0 auto !important;
  }
}
</style>
