import { computed, reactive } from 'vue'

/**
 * Pilha de modais abertos (ModalBase empilha/desempilha): só o do topo responde a Esc e Tab.
 * Reativa: o modal de baixo e o menu lateral ficam inertes enquanto houver modal por cima.
 */
export const pilhaModais = reactive<symbol[]>([])

/** Há algum modal aberto na tela. */
export const haModalAberto = computed(() => pilhaModais.length > 0)
