import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro, mensagemOriginal400 } from '../services/api'
import { listarServicos } from '../services/servicos.service'
import type { TipoOrcamento } from '../types'
import type { FiltrosServicos, Servico } from '../types/servico'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300
/** Máximo da API por página; usado só ao juntar ativos e inativos no filtro "Todos". */
const LIMITE_API = 100
const PAGINAS_MAXIMAS = 20

export type FiltroCategoriaServico = 'TODOS' | TipoOrcamento

/** Todas as páginas de um filtro (a API só lista um status por chamada). */
async function listarTodos(filtros: FiltrosServicos): Promise<Servico[]> {
  const itens: Servico[] = []
  for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
    const resposta = await listarServicos({ ...filtros, page, limit: LIMITE_API })
    itens.push(...resposta.data)
    if (page >= resposta.meta.totalPages) break
  }
  return itens
}

/** O backend aceita `status=TODOS`? Desconhecido até a primeira consulta; o antigo responde 400 e fica lembrado. */
let statusTodosSuportado: boolean | null = null

/**
 * Lista de serviços com busca (debounce), filtros de categoria e status e paginação.
 * Com Ativo, Inativo ou (backend atualizado) `status=TODOS` a paginação é do servidor. O backend antigo só lista um
 * status por chamada (padrão ATIVO): nele "Todos" busca os dois, junta (ativos primeiro) e pagina aqui.
 */
export function useListaServicos() {
  const busca = shallowRef('')
  const categoria = shallowRef<FiltroCategoriaServico>('TODOS')
  const status = shallowRef<FiltroStatus>('ATIVO')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const servicos = shallowRef<Servico[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosServicos = {}
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (categoria.value !== 'TODOS') filtros.categoria = categoria.value

    try {
      let itens: Servico[]
      let totalItens: number
      let totalPaginas: number

      if (status.value === 'TODOS' && statusTodosSuportado !== false) {
        try {
          const resposta = await listarServicos({ ...filtros, status: 'TODOS', page: pagina.value, limit: POR_PAGINA })
          statusTodosSuportado = true
          itens = resposta.data
          totalItens = resposta.meta.total
          totalPaginas = resposta.meta.totalPages
        } catch (e) {
          // Backend antigo: "status" só aceita ATIVO ou INATIVO (400). Lembra e usa as duas chamadas.
          // Só o backend antigo recusa o valor: o 400 cita o campo `status`. Outro 400 (ex.: busca inválida) é erro de verdade.
          if (!/\bstatus\b/i.test(mensagemOriginal400(e))) throw e
          statusTodosSuportado = false
          return carregar()
        }
      } else if (status.value === 'TODOS') {
        const [ativos, inativos] = await Promise.all([
          listarTodos({ ...filtros, status: 'ATIVO' }),
          listarTodos({ ...filtros, status: 'INATIVO' }),
        ])
        const todos = [...ativos, ...inativos]
        const inicio = (pagina.value - 1) * POR_PAGINA
        itens = todos.slice(inicio, inicio + POR_PAGINA)
        totalItens = todos.length
        totalPaginas = Math.ceil(todos.length / POR_PAGINA)
      } else {
        const resposta = await listarServicos({
          ...filtros,
          status: status.value,
          page: pagina.value,
          limit: POR_PAGINA,
        })
        itens = resposta.data
        totalItens = resposta.meta.total
        totalPaginas = resposta.meta.totalPages
      }
      if (requisicao !== ultimaRequisicao) return

      servicos.value = itens
      total.value = totalItens
      // A página deixou de existir (ex.: desativou o último da página): volta para a última.
      if (itens.length === 0 && pagina.value > 1) pagina.value = Math.max(1, totalPaginas)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        servicos.value = []
        total.value = 0
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch(pagina, () => void carregar())

  watch([buscaAplicada, categoria, status], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, categoria, status, pagina, porPagina: POR_PAGINA, servicos, total, carregando, erro, carregar }
}
