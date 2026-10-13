import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarFuncionarios } from '../services/funcionarios.service'
import type { Funcionario } from '../types'

const LIMITE_POR_PAGINA = 100

/** Todos os funcionários (ativos e inativos), percorrendo as páginas da API; usado em seletores. */
export function useTodosFuncionarios() {
  const funcionarios = shallowRef<Funcionario[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      const todos: Funcionario[] = []
      let pagina = 1
      let totalPaginas = 1
      // A API pagina em no máximo 100 por página.
      while (pagina <= totalPaginas) {
        const resposta = await listarFuncionarios({ page: pagina, limit: LIMITE_POR_PAGINA })
        todos.push(...resposta.data)
        totalPaginas = resposta.meta.totalPages
        pagina++
      }
      funcionarios.value = todos.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, carregar }
}
