import { onScopeDispose, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { listarClientes } from '../services/clientes.service'
import { listarClientesParaOrcamento } from '../services/orcamentos.service'
import type { Cliente } from '../types'
import { termoDeBusca } from '../utils/formatadores'

const ATRASO_MS = 300
const LIMITE = 10

/** O que o autocomplete precisa de um cliente; `cpfCnpj` só vem da rota de Clientes e o telefone não vem na lista de Orçamentos. */
export type ClienteBusca = Pick<Cliente, 'id' | 'nome' | 'cidade' | 'estado'> & Partial<Pick<Cliente, 'telefone' | 'cpfCnpj'>>

/**
 * Autocomplete de clientes ATIVOS (só eles podem receber orçamento), com busca no servidor.
 * Usa `/orcamentos/opcoes/clientes` (basta o módulo Orçamentos); em backend sem essa rota cai em `/clientes`,
 * e sem permissão de Clientes (403) a lista não existe: `semPermissao` avisa a tela.
 */
export function useBuscaClienteAtivo() {
  const clientes = shallowRef<ClienteBusca[]>([])
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
      const parametros = termo ? { busca: termo } : {}
      const opcoes = await listarClientesParaOrcamento({ limit: LIMITE, ...parametros })
      const lista = opcoes ?? (await listarClientes({ status: 'ATIVO', limit: LIMITE, ...parametros })).data
      if (requisicao !== ultima) return
      clientes.value = lista
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
