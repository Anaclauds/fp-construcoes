<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts, fecharToast } = useToast()
</script>

<template>
  <!-- Região viva: leitores de tela anunciam a mensagem quando ela aparece. -->
  <div
    class="notificacoes"
    role="status"
    aria-live="polite"
  >
    <TransitionGroup name="notificacao">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="notificacao"
        :class="`notificacao--${toast.tipo}`"
      >
        <span
          class="notificacao-icone"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24">
            <path
              v-if="toast.tipo === 'sucesso'"
              d="M5 12.5l4.5 4.5L19 7.5"
            />
            <path
              v-else
              d="M7 7l10 10M17 7L7 17"
            />
          </svg>
        </span>
        <span class="notificacao-mensagem">{{ toast.mensagem }}</span>
        <button
          type="button"
          class="notificacao-fechar"
          aria-label="Fechar notificação"
          @click="fecharToast(toast.id)"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.notificacoes {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2000;

  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.notificacao {
  min-width: 280px;
  min-height: 70px;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 16px 20px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 14px;
  background-color: #fff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.notificacao-icone {
  width: 38px;
  height: 38px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  background-color: var(--fp-verde);
}

.notificacao--erro .notificacao-icone {
  background-color: var(--fp-vermelho);
}

.notificacao-icone svg {
  width: 20px;
  height: 20px;

  fill: none;
  stroke: #fff;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.notificacao-mensagem {
  flex: 1;
  color: #101828;
  font-size: 16px;
  font-weight: 600;
}

.notificacao-fechar {
  width: 24px;
  height: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.notificacao-fechar svg {
  width: 16px;
  height: 16px;

  fill: none;
  stroke: #6b7280;
  stroke-width: 2;
  stroke-linecap: round;
}

.notificacao-fechar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.notificacao-enter-active,
.notificacao-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.notificacao-enter-from,
.notificacao-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
