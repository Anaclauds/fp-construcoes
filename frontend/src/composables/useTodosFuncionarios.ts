import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarFolhaDoDia } from '../services/frequencias.service'
import { listarFuncionarios } from '../services/funcionarios.service'
import type { Funcionario } from '../types'
import { hojeIso } from '../utils/datas'
import { useAuth } from './useAuth'

const LIMITE_POR_PAGINA = 100

/** O perfil do usuário já mostra que ele não pode consultar o módulo: nem chama a API. */
class SemAcessoLocal extends Error {}

/** Dados mínimos de um funcionário para seletores. */
export type FuncionarioOpcao = Pick<Funcionario, 'id' | 'nomeCompleto' | 'funcao' | 'status'>

/**
 * Todos os funcionários (ativos e inativos), percorrendo as páginas da API; usado em seletores.
 * Quem tem acesso à Frequência mas não a Funcionários recebe 403 em /funcionarios: nesse caso a
 * lista vem da folha do dia (só ativos; limitação do backend, X6: falta uma lista de funcionários para a Frequência) e `somenteAtivos` avisa a tela. Sem acesso a nenhum dos dois
 * módulos, `semPermissao` fica verdadeiro (além de `erro`): a tela pode explicar a permissão necessária.
 * As permissões do usuário logado são conferidas antes: módulo sem acesso nem é consultado (sem 403 no console).
 */
export function useTodosFuncionarios() {
  const funcionarios = shallowRef<FuncionarioOpcao[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const somenteAtivos = shallowRef(false)
  const semPermissao = shallowRef(false)
  const { temPermissao } = useAuth()

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
        if (!temPermissao('GESTAO_FUNCIONARIOS', 'visualizar')) throw new SemAcessoLocal()
        lista = await buscarTodos()
      } catch (e) {
        if (!(e instanceof SemAcessoLocal) && extrairErro(e).status !== 403) throw e
        if (!temPermissao('FREQUENCIA', 'visualizar')) throw new SemAcessoLocal()
        lista = await buscarAtivosDaFolha()
        somenteAtivos.value = true
      }
      funcionarios.value = lista.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'))
    } catch (e) {
      if (e instanceof SemAcessoLocal) {
        semPermissao.value = true
        erro.value = 'Sem permissão para listar funcionários.'
      } else {
        const { mensagem, status } = extrairErro(e)
        semPermissao.value = status === 403
        erro.value = mensagem
      }
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, somenteAtivos, semPermissao, carregar }
}
