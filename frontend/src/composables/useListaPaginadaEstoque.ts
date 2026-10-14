import { shallowRef, watch, type WatchSource } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import type { Paginado } from '../types/paginado'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'
import { useToast } from './useToast'
import { useFiltrosNaUrl, type CampoUrl } from './useFiltrosNaUrl'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300
/** Máximo da API por página; usado só ao juntar ativos e inativos no filtro "Todos". */
const LIMITE_API = 100
const PAGINAS_MAXIMAS = 20

interface FiltrosBase {
  busca?: string
  status?: 'ATIVO' | 'INATIVO' | 'TODOS'
  page?: number
  limit?: number
}

interface Opcoes<T, F extends FiltrosBase> {
  listar: (filtros: F) => Promise<Paginado<T>>
  /** Filtros extras da tela (categoria, tipo...), lidos a cada consulta. */
  filtrosExtras: () => Partial<F>
  /** Refs dos filtros extras: mudar qualquer um volta à página 1 e recarrega. */
  fontesExtras: WatchSource[]
  /** Ajusta o termo digitado antes de enviar (ex.: tirar acentos de um rótulo que a API guarda sem eles). */
  transformarBusca?: (termo: string) => string
  /** Guarda busca, status, filtros extras e página na URL da rota. */
  url?: { rota: string; extras: CampoUrl[] }
}

/**
 * Lista de cadastros do Estoque e Suprimentos (material, equipamento, fornecedor) com busca (debounce),
 * filtro de status e paginação. Ativo e Inativo usam a paginação do servidor. A API só lista um status por
 * chamada (padrão ATIVO) e nenhum backend aceita `status=TODOS` nestes recursos: "Todos" busca os dois
 * status, junta (ativos primeiro) e pagina aqui, sem sondar a API antes.
 */
export function useListaPaginadaEstoque<T, F extends FiltrosBase>({
  listar,
  filtrosExtras,
  fontesExtras,
  transformarBusca,
  url,
}: Opcoes<T, F>) {
  const { mostrarToast } = useToast()
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatus>('ATIVO')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const itens = shallowRef<T[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** "Todos" passou do limite de páginas lidas: a lista mostra só parte dos cadastros. */
  const truncado = shallowRef(false)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function listarTodos(filtros: F): Promise<{ itens: T[]; truncado: boolean }> {
    const todos: T[] = []
    for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
      const resposta = await listar({ ...filtros, page, limit: LIMITE_API })
      todos.push(...resposta.data)
      if (page >= resposta.meta.totalPages) return { itens: todos, truncado: false }
    }
    return { itens: todos, truncado: true }
  }

  async function carregar(): Promise<void> {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros = { ...filtrosExtras() } as F
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = transformarBusca ? transformarBusca(termo) : termo

    try {
      let resultado: T[]
      let totalItens: number
      let totalPaginas: number

      let cortado = false
      if (status.value === 'TODOS') {
        const [ativos, inativos] = await Promise.all([
          listarTodos({ ...filtros, status: 'ATIVO' }),
          listarTodos({ ...filtros, status: 'INATIVO' }),
        ])
        cortado = ativos.truncado || inativos.truncado
        const todos = [...ativos.itens, ...inativos.itens]
        const inicio = (pagina.value - 1) * POR_PAGINA
        resultado = todos.slice(inicio, inicio + POR_PAGINA)
        totalItens = todos.length
        totalPaginas = Math.ceil(todos.length / POR_PAGINA)
      } else {
        const resposta = await listar({ ...filtros, status: status.value, page: pagina.value, limit: POR_PAGINA })
        resultado = resposta.data
        totalItens = resposta.meta.total
        totalPaginas = resposta.meta.totalPages
      }
      if (requisicao !== ultimaRequisicao) return

      itens.value = resultado
      if (cortado && !truncado.value) {
        mostrarToast(
          `Há mais de ${(PAGINAS_MAXIMAS * LIMITE_API).toLocaleString('pt-BR')} cadastros em um dos status: a lista "Todos" está incompleta. Filtre por Ativo ou Inativo.`,
          'info',
          8000,
        )
      }
      truncado.value = cortado
      total.value = totalItens
      // A página deixou de existir (ex.: desativou o último da página): volta para a última.
      if (resultado.length === 0 && pagina.value > 1) pagina.value = Math.max(1, totalPaginas)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        itens.value = []
        total.value = 0
        truncado.value = false
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  if (url) {
    const campos: CampoUrl[] = [
      {
        param: 'busca',
        ler: () => buscaAplicada.value.trim(),
        definir: (valor) => {
          busca.value = valor
          buscaAplicada.value = valor // na hora: senão a URL voltaria a receber a busca antiga
        },
        padrao: '',
      },
      {
        param: 'status',
        ler: () => status.value,
        definir: (valor) => (status.value = valor as FiltroStatus),
        padrao: 'ATIVO',
        valido: (valor) => ['ATIVO', 'INATIVO', 'TODOS'].includes(valor),
      },
      ...url.extras,
    ]
    useFiltrosNaUrl(url.rota, campos, pagina)
  }

  watch(pagina, () => void carregar())

  watch([buscaAplicada, status, ...fontesExtras], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, status, pagina, porPagina: POR_PAGINA, itens, total, truncado, carregando, erro, carregar }
}
