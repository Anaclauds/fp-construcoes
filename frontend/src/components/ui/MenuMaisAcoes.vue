<script lang="ts">
export interface ItemMenuAcao {
  valor: string
  rotulo: string
  /** Ação destrutiva: texto vermelho. */
  perigo?: boolean
}
</script>

<script setup lang="ts">
import { nextTick, shallowRef, useId, useTemplateRef } from 'vue'

defineProps<{
  itens: ItemMenuAcao[]
  rotulo?: string
}>()

const emit = defineEmits<{ escolher: [valor: string] }>()

const id = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const aberto = shallowRef(false)

async function alternar() {
  aberto.value = !aberto.value
  if (aberto.value) {
    await nextTick()
    raiz.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }
}

function fechar(devolverFoco = false) {
  aberto.value = false
  if (devolverFoco) raiz.value?.querySelector<HTMLElement>('.menu-gatilho')?.focus()
}

function escolher(valor: string) {
  fechar()
  emit('escolher', valor)
}

function aoSairDoFoco(evento: FocusEvent) {
  if (!raiz.value?.contains(evento.relatedTarget as Node | null)) aberto.value = false
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && aberto.value) {
    // Fecha só o menu (não o modal em volta).
    evento.stopPropagation()
    fechar(true)
    return
  }
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return
  evento.preventDefault()
  const itensDom = Array.from(raiz.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
  const atual = itensDom.indexOf(document.activeElement as HTMLElement)
  const proximo = evento.key === 'ArrowDown' ? atual + 1 : atual - 1
  itensDom[(proximo + itensDom.length) % itensDom.length]?.focus()
}
</script>

<template>
  <div
    ref="raiz"
    class="menu"
    @focusout="aoSairDoFoco"
    @keydown="aoTeclar"
  >
    <button
      type="button"
      class="menu-gatilho"
      aria-haspopup="menu"
      :aria-expanded="aberto"
      :aria-controls="id"
      @click="alternar"
    >
      {{ rotulo ?? 'Mais ações' }}
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path d="M6 15l6-6 6 6" />
      </svg>
    </button>

    <ul
      v-show="aberto"
      :id="id"
      class="menu-lista"
      role="menu"
    >
      <li
        v-for="item in itens"
        :key="item.valor"
        role="none"
      >
        <button
          type="button"
          role="menuitem"
          class="menu-item"
          :class="{ 'menu-item--perigo': item.perigo }"
          @click="escolher(item.valor)"
        >
          {{ item.rotulo }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.menu {
  position: relative;
}

.menu-gatilho {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 8px 6px;
  border: 0;
  border-radius: 8px;
  background: none;

  color: #666;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.menu-gatilho:hover {
  color: var(--fp-verde);
}

.menu-gatilho:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.menu-gatilho svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Celular: alvo de toque maior. */
@media (max-width: 575px) {
  .menu-gatilho {
    min-height: 40px;
  }

  .menu-lista {
    min-width: min(220px, calc(100vw - 48px));
  }
}

/* Abre para cima: o menu fica no rodapé do modal. */
.menu-lista {
  position: absolute;
  z-index: 10;
  bottom: calc(100% + 6px);
  left: 0;

  min-width: 220px;
  margin: 0;
  padding: 6px;
  list-style: none;

  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
}

.menu-item {
  width: 100%;
  padding: 9px 12px;
  border: 0;
  border-radius: 7px;
  background: none;

  color: #333;
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.menu-item:hover,
.menu-item:focus-visible {
  outline: none;
  background-color: var(--fp-cinza-fundo);
}

.menu-item--perigo {
  color: var(--fp-vermelho);
}
</style>
