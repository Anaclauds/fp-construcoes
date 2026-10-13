import { shallowRef } from 'vue'

export interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

// Estado em escopo de módulo: qualquer tela dispara, o ToastContainer (em App.vue) exibe.
const toasts = shallowRef<Toast[]>([])
let proximoId = 1
const DURACAO_PADRAO = 4000

function fecharToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function mostrarToast(mensagem: string, tipo: Toast['tipo'] = 'sucesso', duracao = DURACAO_PADRAO) {
  const id = proximoId++
  toasts.value = [...toasts.value, { id, mensagem, tipo }]
  window.setTimeout(() => fecharToast(id), duracao)
}

export function useToast() {
  return { toasts, mostrarToast, fecharToast }
}
