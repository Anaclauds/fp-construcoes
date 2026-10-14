<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useId, useTemplateRef } from 'vue'
import BotaoAcao from '../ui/BotaoAcao.vue'
import type { ItemMenuAcao } from '../ui/MenuMaisAcoes.vue'

defineProps<{
  itens: ItemMenuAcao[]
  /** Nome do projeto, usado no rótulo acessível ("Mais ações #0001"). */
  alvo?: string
}>()

const emit = defineEmits<{ escolher: [valor: string] }>()

const id = useId()
const gatilho = useTemplateRef<InstanceType<typeof BotaoAcao>>('gatilho')
const lista = useTemplateRef<HTMLElement>('lista')
const aberto = shallowRef(false)
const posicao = shallowRef({ top: 0, left: 0, para: 'baixo' as 'baixo' | 'cima' })

const LARGURA_MENU = 230
const ALTURA_ESTIMADA = 190

function botaoGatilho(): HTMLElement | null {
  return (gatilho.value?.$el as HTMLElement | undefined) ?? null
}

/** O menu fica fora da tabela (Teleport) para não ser cortado pela rolagem dela; abre para cima se faltar espaço embaixo. */
function posicionar() {
  const caixa = botaoGatilho()?.getBoundingClientRect()
  if (!caixa) return
  const cabeEmbaixo = caixa.bottom + ALTURA_ESTIMADA + 8 < window.innerHeight
  const left = Math.max(8, Math.min(caixa.right - LARGURA_MENU, window.innerWidth - LARGURA_MENU - 8))
  posicao.value = cabeEmbaixo
    ? { top: caixa.bottom + 6, left, para: 'baixo' }
    : { top: caixa.top - 6, left, para: 'cima' }
}

function aoClicarFora(evento: MouseEvent) {
  const alvo = evento.target as Node
  if (lista.value?.contains(alvo) || botaoGatilho()?.contains(alvo)) return
  fechar()
}

function fechar(devolverFoco = false) {
  if (!aberto.value) return
  aberto.value = false
  document.removeEventListener('mousedown', aoClicarFora)
  window.removeEventListener('resize', fecharSemFoco)
  document.removeEventListener('scroll', fecharSemFoco, true)
  if (devolverFoco) botaoGatilho()?.focus()
}

function fecharSemFoco() {
  fechar()
}

async function alternar() {
  if (aberto.value) {
    fechar(true)
    return
  }
  posicionar()
  aberto.value = true
  document.addEventListener('mousedown', aoClicarFora)
  window.addEventListener('resize', fecharSemFoco)
  // A rolagem da tabela/página move o gatilho: fecha em vez de deixar o menu solto no ar.
  document.addEventListener('scroll', fecharSemFoco, true)
  await nextTick()
  lista.value?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
}

function escolher(valor: string) {
  fechar(true)
  emit('escolher', valor)
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    // Fecha só o menu (não um modal em volta).
    evento.stopPropagation()
    fechar(true)
    return
  }
  if (evento.key === 'Tab') {
    fechar()
    return
  }
  if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return
  evento.preventDefault()
  const itensDom = Array.from(lista.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
  const atual = itensDom.indexOf(document.activeElement as HTMLElement)
  const proximo = evento.key === 'ArrowDown' ? atual + 1 : atual - 1
  itensDom[(proximo + itensDom.length) % itensDom.length]?.focus()
}

onBeforeUnmount(() => fechar())
</script>

<template>
  <span class="menu-acoes">
    <BotaoAcao
      ref="gatilho"
      tipo="mais"
      :alvo="alvo"
      aria-haspopup="menu"
      :aria-expanded="aberto"
      :aria-controls="aberto ? id : undefined"
      @click="alternar"
    />

    <Teleport to="body">
      <ul
        v-if="aberto"
        :id="id"
        ref="lista"
        class="menu-acoes-lista"
        :class="`menu-acoes-lista--${posicao.para}`"
        role="menu"
        :style="{ top: `${posicao.top}px`, left: `${posicao.left}px`, width: `${LARGURA_MENU}px` }"
        @keydown="aoTeclar"
      >
        <li
          v-for="item in itens"
          :key="item.valor"
          role="none"
        >
          <button
            type="button"
            role="menuitem"
            class="menu-acoes-item"
            :class="{ 'menu-acoes-item--perigo': item.perigo }"
            @click="escolher(item.valor)"
          >
            {{ item.rotulo }}
          </button>
        </li>
      </ul>
    </Teleport>
  </span>
</template>

<style scoped>
.menu-acoes {
  display: inline-flex;
}

.menu-acoes-lista {
  position: fixed;
  z-index: 900;

  margin: 0;
  padding: 6px;
  list-style: none;

  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
}

.menu-acoes-lista--cima {
  transform: translateY(-100%);
}

.menu-acoes-item {
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

.menu-acoes-item:hover,
.menu-acoes-item:focus-visible {
  outline: none;
  background-color: var(--fp-cinza-fundo);
}

.menu-acoes-item--perigo {
  color: var(--fp-vermelho);
}
</style>
