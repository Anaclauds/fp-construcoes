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
        :class="[`notificacao--${toast.tipo}`, { 'notificacao--detalhes': toast.detalhes }]"
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
              v-else-if="toast.tipo === 'info'"
              d="M12 11v5.5M12 7.5h.01"
            />
            <path
              v-else
              d="M7 7l10 10M17 7L7 17"
            />
          </svg>
        </span>
        <span class="notificacao-texto">
          <span class="notificacao-mensagem">{{ toast.mensagem }}</span>
          <span
            v-for="detalhe in toast.detalhes"
            :key="detalhe"
            class="notificacao-detalhe"
          >{{ detalhe }}</span>
        </span>
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
  /* Centro inferior: área livre entre o "Mostrando X de Y"/Cancelar (esquerda) e a paginação/
     Salvar (direita); não cobre o botão de ação do topo nem os filtros. */
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  z-index: 2000;

  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.notificacao {
  /* Figma (Salvo com sucesso! / Cobrança Realizada!): cartão de 309x84, ícone de 38px a 28px da borda. */
  box-sizing: border-box;
  width: 309px;
  max-width: calc(100vw - 32px);
  min-height: 84px;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 16px 14px 16px 27px; /* esquerda: 28px do Figma menos a borda; à direita sobra um pouco para o título não quebrar */
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

.notificacao--info .notificacao-icone {
  background-color: #2563eb;
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

.notificacao--detalhes {
  width: 420px;
}

/* Texto longo (avisos do servidor) rola dentro do cartão em vez de cobrir a tabela. */
.notificacao-texto {
  flex: 1;
  min-width: 0;
  max-height: min(40vh, 260px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notificacao-detalhe {
  color: #4a5565;
  font-size: 14px;
  line-height: 20px;
  overflow-wrap: anywhere;
}

.notificacao-mensagem {
  min-width: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 600;
  line-height: 26px;
  overflow-wrap: anywhere;
}

.notificacao-fechar {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  /* Figma: o X encosta no bloco de texto (190px de largura, sem folga entre os dois). */
  margin-left: -12px;

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
