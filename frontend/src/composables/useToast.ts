import { shallowRef } from 'vue'

export interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro' | 'info'
  /** Avisos secundários, em fonte menor abaixo da mensagem (um único toast em vez de vários empilhados). */
  detalhes?: string[]
}

/** Quem está segurando o toast aberto: o mouse sobre ele ou o foco do teclado dentro dele. */
export type MotivoPausaToast = 'ponteiro' | 'foco'

interface Contagem {
  /** Tempo que ainda falta para fechar, em ms. */
  restante: number
  /** Quando o relógio atual começou a correr; `null` enquanto pausado. */
  inicio: number | null
  temporizador: number | null
  motivos: Set<MotivoPausaToast>
}

// Estado em escopo de módulo: qualquer tela dispara, o ToastContainer (em App.vue) exibe.
const toasts = shallowRef<Toast[]>([])
let proximoId = 1
const DURACAO_PADRAO = 4000
/** Erro precisa de mais tempo para ser lido (e costuma dizer o que fazer). */
const DURACAO_ERRO = 8000
/** Mais que isso empilhado cobre a tela: o mais antigo sai para dar lugar ao novo. */
const MAXIMO_VISIVEIS = 3

const contagens = new Map<number, Contagem>()

function limparContagem(id: number) {
  const contagem = contagens.get(id)
  if (contagem?.temporizador != null) window.clearTimeout(contagem.temporizador)
  contagens.delete(id)
}

function fecharToast(id: number) {
  limparContagem(id)
  toasts.value = toasts.value.filter((t) => t.id !== id)
}

function iniciarRelogio(id: number, contagem: Contagem) {
  contagem.inicio = Date.now()
  contagem.temporizador = window.setTimeout(() => fecharToast(id), contagem.restante)
}

/** Segura o toast aberto (mouse em cima, foco dentro): o tempo só volta a correr quando todos os motivos saem. */
function pausarToast(id: number, motivo: MotivoPausaToast = 'ponteiro') {
  const contagem = contagens.get(id)
  if (!contagem) return
  contagem.motivos.add(motivo)
  if (contagem.temporizador == null || contagem.inicio == null) return
  window.clearTimeout(contagem.temporizador)
  contagem.temporizador = null
  contagem.restante = Math.max(contagem.restante - (Date.now() - contagem.inicio), 0)
  contagem.inicio = null
}

function retomarToast(id: number, motivo: MotivoPausaToast = 'ponteiro') {
  const contagem = contagens.get(id)
  if (!contagem) return
  contagem.motivos.delete(motivo)
  // Depois de soltar, sobra ao menos 1 segundo para o usuário reler o que já estava lendo.
  if (contagem.motivos.size === 0 && contagem.temporizador == null) {
    contagem.restante = Math.max(contagem.restante, 1000)
    iniciarRelogio(id, contagem)
  }
}

function mostrarToast(mensagem: string, tipo: Toast['tipo'] = 'sucesso', duracao?: number, detalhes?: string[]) {
  const id = proximoId++
  const avisos = detalhes?.filter(Boolean)
  const mantidos = [...toasts.value, { id, mensagem, tipo, detalhes: avisos?.length ? avisos : undefined }].slice(-MAXIMO_VISIVEIS)
  // Quem saiu da pilha também perde o relógio.
  for (const existente of toasts.value) if (!mantidos.some((t) => t.id === existente.id)) limparContagem(existente.id)
  toasts.value = mantidos

  const contagem: Contagem = {
    restante: duracao ?? (tipo === 'erro' ? DURACAO_ERRO : DURACAO_PADRAO),
    inicio: null,
    temporizador: null,
    motivos: new Set(),
  }
  contagens.set(id, contagem)
  iniciarRelogio(id, contagem)
}

export function useToast() {
  return { toasts, mostrarToast, fecharToast, pausarToast, retomarToast }
}
