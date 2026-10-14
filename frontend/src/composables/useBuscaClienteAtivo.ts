import { onScopeDispose, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { listarClientes } from '../services/clientes.service'
import type { Cliente } from '../types'
import { termoDeBusca } from '../utils/formatadores'

const ATRASO_MS = 300
const LIMITE = 10

/**
 * Autocomplete de clientes ATIVOS (só eles podem receber orçamento), com busca no servidor.
 * Sem permissão de Clientes (403) a lista não existe: `semPermissao` avisa a tela.
 */
export function useBuscaClienteAtivo() {
  const clientes = shallowRef<Cliente[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const semPermissao = shallowRef(false)

  let temporizador: number | undefined
  // Só a última busca vale: respostas antigas (digitação rápida) são descartadas.
  let ultima = 0

  async function executar(texto: string) {
    const requisicao = ++ultima
    carregando.value = true
    erro.value = null
    try {
      const termo = termoDeBusca(texto.trim())
      const resposta = await listarClientes({ status: 'ATIVO', limit: LIMITE, ...(termo ? { busca: termo } : {}) })
      if (requisicao !== ultima) return
      clientes.value = resposta.data
      semPermissao.value = false
    } catch (e) {
      if (requisicao !== ultima) return
      clientes.value = []
      const { status, mensagem } = extrairErro(e)
      semPermissao.value = status === 403
      erro.value = status === 403 ? null : mensagem
    } finally {
      if (requisicao === ultima) carregando.value = false
    }
  }

  /** Busca com debounce (digitação). */
  function buscar(texto: string) {
    window.clearTimeout(temporizador)
    carregando.value = true
    temporizador = window.setTimeout(() => void executar(texto), ATRASO_MS)
  }

  /** Busca imediata (abrir a lista: primeiros clientes por nome). */
  function carregarInicial() {
    window.clearTimeout(temporizador)
    return executar('')
  }

  onScopeDispose(() => window.clearTimeout(temporizador))

  return { clientes, carregando, erro, semPermissao, buscar, carregarInicial }
}
