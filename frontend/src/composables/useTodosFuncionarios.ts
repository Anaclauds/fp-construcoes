import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarOpcoesFuncionarios } from '../services/frequencias.service'
import type { FuncionarioFrequencia } from '../types'
import { useAuth } from './useAuth'

/** Dados mínimos de um funcionário para seletores. */
export type FuncionarioOpcao = Pick<FuncionarioFrequencia, 'id' | 'nomeCompleto' | 'funcao' | 'status'>

/**
 * Todos os funcionários (ativos e inativos) para seletores, via GET /frequencias/opcoes/funcionarios?status=TODOS
 * (permissão FREQUENCIA visualizar; a rota não devolve salário nem dados sensíveis).
 * Sem essa permissão a API nem é chamada e `erro` explica.
 */
export function useTodosFuncionarios() {
  const funcionarios = shallowRef<FuncionarioOpcao[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const { temPermissao } = useAuth()

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      if (!temPermissao('FREQUENCIA', 'visualizar')) {
        erro.value = 'Sem permissão para listar funcionários.'
        return
      }
      const lista = await listarOpcoesFuncionarios('TODOS')
      funcionarios.value = lista
        .map(({ id, nomeCompleto, funcao, status }) => ({ id, nomeCompleto, funcao, status }))
        .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, carregar }
}
