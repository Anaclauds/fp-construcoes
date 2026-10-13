import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarFuncionarios } from '../services/funcionarios.service'
import type { Funcionario } from '../types'

const LIMITE_POR_PAGINA = 100

/** Funcionários ATIVOS que ainda não têm usuário (candidatos ao cadastro de acesso). */
export function useFuncionariosSemUsuario() {
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
      // A API pagina em no máximo 100: percorre todas as páginas para não perder candidatos.
      while (pagina <= totalPaginas) {
        const resposta = await listarFuncionarios({ status: 'ATIVO', page: pagina, limit: LIMITE_POR_PAGINA })
        todos.push(...resposta.data)
        totalPaginas = resposta.meta.totalPages
        pagina++
      }
      funcionarios.value = todos.filter((f) => f.usuario === null)
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, carregar }
}
