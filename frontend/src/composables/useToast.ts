import { shallowRef } from 'vue'

export interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro' | 'info'
  /** Avisos secundários, em fonte menor abaixo da mensagem (um único toast em vez de vários empilhados). */
  detalhes?: string[]
}

// Estado em escopo de módulo: qualquer tela dispara, o ToastContainer (em App.vue) exibe.
const toasts = shallowRef<Toast[]>([])
let proximoId = 1
const DURACAO_PADRAO = 4000
/** Mais que isso empilhado cobre a tela: o mais antigo sai para dar lugar ao novo. */
const MAXIMO_VISIVEIS = 3

function fecharToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function mostrarToast(mensagem: string, tipo: Toast['tipo'] = 'sucesso', duracao = DURACAO_PADRAO, detalhes?: string[]) {
  const id = proximoId++
  const avisos = detalhes?.filter(Boolean)
  toasts.value = [...toasts.value, { id, mensagem, tipo, detalhes: avisos?.length ? avisos : undefined }].slice(-MAXIMO_VISIVEIS)
  window.setTimeout(() => fecharToast(id), duracao)
}

export function useToast() {
  return { toasts, mostrarToast, fecharToast }
}
