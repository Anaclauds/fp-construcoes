<script lang="ts">
export type VarianteModal = 'verde' | 'vermelho' | 'aviso'
export type IconeModal = 'olho' | 'lapis' | 'x' | 'check' | 'alerta'

// Escopo de módulo: modais abertos em sequência (Visualizar -> Editar) compartilham o bloqueio de rolagem.
let modaisAbertos = 0

// Pilha de modais abertos: só o do topo responde a Esc e Tab (ex.: confirmação aberta sobre um formulário).
const pilha: symbol[] = []

function atualizarContador(delta: number) {
  modaisAbertos = Math.max(0, modaisAbertos + delta)
  document.body.style.overflow = modaisAbertos > 0 ? 'hidden' : ''
}
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    aberto: boolean
    titulo: string
    subtitulo?: string
    variante?: VarianteModal
    icone?: IconeModal
    /** Largura máxima do cartão (CSS). */
    largura?: string
    /** Impede fechar (Esc, X, clique fora) enquanto algo está sendo salvo. */
    bloqueado?: boolean
  }>(),
  { variante: 'verde', icone: 'olho', largura: '680px', bloqueado: false },
)

const emit = defineEmits<{ fechar: [] }>()

const idTitulo = useId()
const dialogo = shallowRef<HTMLElement | null>(null)

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const meuId = Symbol('modal')
const noTopo = () => pilha[pilha.length - 1] === meuId

let elementoAnterior: HTMLElement | null = null
let travouRolagem = false
function pedirFechar() {
  if (!props.bloqueado) emit('fechar')
}

function focaveis(): HTMLElement[] {
  return dialogo.value
    ? Array.from(dialogo.value.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(
        (el) => el.offsetParent !== null,
      )
    : []
}

async function aoAbrir() {
  elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!travouRolagem) {
    travouRolagem = true
    atualizarContador(1)
  }
  if (!pilha.includes(meuId)) pilha.push(meuId)
  // No document, não no cartão: se o foco cair no <body> (botão desabilitado ao salvar), Esc e Tab continuam valendo.
  document.addEventListener('keydown', aoTeclar)
  await nextTick()
  // Foco no próprio diálogo (leitor de tela anuncia o título) sem pré-selecionar nenhum campo;
  // o primeiro Tab leva ao primeiro elemento do modal.
  dialogo.value?.focus()
}

function aoFechar() {
  document.removeEventListener('keydown', aoTeclar)
  const posicao = pilha.indexOf(meuId)
  if (posicao >= 0) pilha.splice(posicao, 1)
  if (travouRolagem) {
    travouRolagem = false
    atualizarContador(-1)
  }
  if (elementoAnterior?.isConnected) elementoAnterior.focus()
  elementoAnterior = null
}

watch(
  () => props.aberto,
  (aberto) => (aberto ? aoAbrir() : aoFechar()),
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  if (props.aberto) aoFechar()
})

/** Foco fora do cartão (ex.: no <body> depois que o botão focado foi desabilitado): devolve ao diálogo. */
function devolverFoco() {
  const ativo = document.activeElement
  const dentro = ativo instanceof HTMLElement && dialogo.value?.contains(ativo) && !(ativo as HTMLButtonElement).disabled
  if (props.aberto && noTopo() && !dentro) dialogo.value?.focus()
}

// Começou ou terminou de salvar: o botão clicado muda de estado e o foco some; traz de volta ao diálogo.
watch(
  () => props.bloqueado,
  async () => {
    await nextTick()
    devolverFoco()
  },
  { flush: 'post' },
)

function aoTeclar(evento: KeyboardEvent) {
  if (!noTopo()) return

  if (evento.key === 'Escape') {
    evento.stopPropagation()
    pedirFechar()
    return
  }

  // Prende o Tab dentro do diálogo.
  if (evento.key === 'Tab') {
    const lista = focaveis()
    if (lista.length === 0) {
      evento.preventDefault()
      return
    }
    const primeiro = lista[0]!
    const ultimo = lista[lista.length - 1]!
    const ativo = document.activeElement
    // Foco fora do cartão: o Tab entra no diálogo em vez de seguir para a página de trás.
    if (!(ativo instanceof HTMLElement) || !dialogo.value?.contains(ativo)) {
      evento.preventDefault()
      ;(evento.shiftKey ? ultimo : primeiro).focus()
      return
    }
    if (evento.shiftKey && (ativo === primeiro || ativo === dialogo.value)) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && ativo === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }
}

// Só fecha se o clique começou E terminou no fundo (arrastar seleção de texto não fecha).
let cliqueIniciouNoFundo = false

function aoPressionarFundo(evento: MouseEvent) {
  cliqueIniciouNoFundo = evento.target === evento.currentTarget
}

function aoClicarFundo(evento: MouseEvent) {
  if (cliqueIniciouNoFundo && evento.target === evento.currentTarget) pedirFechar()
  cliqueIniciouNoFundo = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="aberto"
      class="modal-fundo"
      @mousedown="aoPressionarFundo"
      @click="aoClicarFundo"
    >
      <div
        ref="dialogo"
        class="modal-fp"
        :class="`modal-fp--${variante}`"
        :style="{ maxWidth: largura }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
        tabindex="-1"
      >
        <header class="modal-cabecalho">
          <span
            class="modal-icone"
            :class="{ 'modal-icone--circulo': icone === 'x' || icone === 'check' || icone === 'alerta' }"
            aria-hidden="true"
          >
            <svg
              v-if="icone === 'olho'"
              viewBox="0 0 24 24"
            >
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
            <svg
              v-else-if="icone === 'lapis'"
              viewBox="0 0 24 24"
            >
              <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
              <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 8 16l1.2-4z" />
            </svg>
            <svg
              v-else-if="icone === 'x'"
              viewBox="0 0 24 24"
            >
              <path d="M7 7l10 10M17 7L7 17" />
            </svg>
            <svg
              v-else-if="icone === 'alerta'"
              viewBox="0 0 24 24"
            >
              <path d="M12 7v6M12 17h.01" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>

          <div class="modal-titulos">
            <h2
              :id="idTitulo"
              class="modal-titulo"
            >
              {{ titulo }}
            </h2>
            <p
              v-if="subtitulo"
              class="modal-subtitulo"
            >
              {{ subtitulo }}
            </p>
          </div>

          <button
            type="button"
            class="modal-fechar"
            aria-label="Fechar"
            :disabled="bloqueado"
            @click="pedirFechar"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div class="modal-corpo">
          <slot />
        </div>

        <footer
          v-if="$slots.rodape || $slots['rodape-esquerda']"
          class="modal-rodape"
        >
          <div class="modal-rodape-esquerda">
            <slot name="rodape-esquerda" />
          </div>
          <div class="modal-rodape-direita">
            <slot name="rodape" />
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-fundo {
  position: fixed;
  inset: 0;
  z-index: 1000;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 16px;
  background-color: rgba(17, 24, 39, 0.55);
  animation: modal-fundo-entrada 0.15s ease;
}

.modal-fp {
  width: 100%;
  max-height: calc(100vh - 32px);

  display: flex;
  flex-direction: column;

  border-radius: 16px;
  background-color: #fff;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  animation: modal-entrada 0.18s ease;
}

.modal-fp:focus {
  outline: none;
}

.modal-cabecalho {
  min-height: 84px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  gap: 16px;

  padding: 16px 24px 16px 32px;
  background-color: var(--fp-verde);
  color: #fff;
}

.modal-fp--vermelho .modal-cabecalho {
  background-color: var(--fp-vermelho);
}

.modal-fp--aviso .modal-cabecalho {
  background-color: #d97706;
}

.modal-icone {
  width: 24px;
  height: 24px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-icone svg {
  width: 24px;
  height: 24px;

  fill: none;
  stroke: #fff;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.modal-icone--circulo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-icone--circulo svg {
  width: 20px;
  height: 20px;
  stroke-width: 2.2;
}

.modal-titulos {
  flex: 1;
  min-width: 0;
}

.modal-titulo {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
}

.modal-subtitulo {
  margin: 0;
  font-size: 13px;
  opacity: 0.85;
}

.modal-fechar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 0;
  border-radius: 8px;
  background: none;

  cursor: pointer;
}

.modal-fechar svg {
  width: 20px;
  height: 20px;

  fill: none;
  stroke: #fff;
  stroke-width: 2;
  stroke-linecap: round;
}

.modal-fechar:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.15);
}

.modal-fechar:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.modal-fechar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-corpo {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px;
}

.modal-rodape {
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 18px 28px;
  border-top: 1px solid var(--fp-cinza-borda);
}

.modal-rodape-direita {
  margin-left: auto;
  display: flex;
  gap: 12px;
}

@keyframes modal-fundo-entrada {
  from {
    opacity: 0;
  }
}

@keyframes modal-entrada {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
