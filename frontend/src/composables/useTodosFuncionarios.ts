import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarFolhaDoDia } from '../services/frequencias.service'
import { listarFuncionarios } from '../services/funcionarios.service'
import type { Funcionario } from '../types'
import { hojeIso } from '../utils/datas'

const LIMITE_POR_PAGINA = 100

/** Dados mínimos de um funcionário para seletores. */
export type FuncionarioOpcao = Pick<Funcionario, 'id' | 'nomeCompleto' | 'funcao' | 'status'>

/**
 * Todos os funcionários (ativos e inativos), percorrendo as páginas da API; usado em seletores.
 * Quem tem acesso à Frequência mas não a Funcionários recebe 403 em /funcionarios: nesse caso a
 * lista vem da folha do dia (só ativos) e `somenteAtivos` avisa a tela. Sem acesso a nenhum dos dois
 * módulos, `semPermissao` fica verdadeiro (além de `erro`): a tela pode explicar a permissão necessária.
 */
export function useTodosFuncionarios() {
  const funcionarios = shallowRef<FuncionarioOpcao[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const somenteAtivos = shallowRef(false)
  const semPermissao = shallowRef(false)

  async function buscarTodos(): Promise<FuncionarioOpcao[]> {
    const todos: FuncionarioOpcao[] = []
    let pagina = 1
    let totalPaginas = 1
    // A API pagina em no máximo 100 por página.
    while (pagina <= totalPaginas) {
      const resposta = await listarFuncionarios({ page: pagina, limit: LIMITE_POR_PAGINA })
      todos.push(...resposta.data)
      totalPaginas = resposta.meta.totalPages
      pagina++
    }
    return todos
  }

  async function buscarAtivosDaFolha(): Promise<FuncionarioOpcao[]> {
    const folha = await buscarFolhaDoDia({ data: hojeIso() })
    return folha.registros.map(({ funcionario }) => ({
      id: funcionario.id,
      nomeCompleto: funcionario.nomeCompleto,
      funcao: funcionario.funcao,
      status: funcionario.status,
    }))
  }

  async function carregar() {
    carregando.value = true
    erro.value = null
    somenteAtivos.value = false
    semPermissao.value = false
    try {
      let lista: FuncionarioOpcao[]
      try {
        lista = await buscarTodos()
      } catch (e) {
        if (extrairErro(e).status !== 403) throw e
        lista = await buscarAtivosDaFolha()
        somenteAtivos.value = true
      }
      funcionarios.value = lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))
    } catch (e) {
      const { mensagem, status } = extrairErro(e)
      semPermissao.value = status === 403
      erro.value = mensagem
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, somenteAtivos, semPermissao, carregar }
}
