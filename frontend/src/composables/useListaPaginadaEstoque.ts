import { shallowRef, watch, type WatchSource } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import type { Paginado } from '../types/paginado'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'
import { useFiltrosNaUrl, type CampoUrl } from './useFiltrosNaUrl'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

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
 * filtro de status e paginação do servidor. O backend aceita `status=TODOS` (ativos e inativos juntos).
 */
export function useListaPaginadaEstoque<T, F extends FiltrosBase>({
  listar,
  filtrosExtras,
  fontesExtras,
  transformarBusca,
  url,
}: Opcoes<T, F>) {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatus>('ATIVO')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const itens = shallowRef<T[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar(): Promise<void> {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros = { ...filtrosExtras() } as F
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = transformarBusca ? transformarBusca(termo) : termo

    try {
      const resposta = await listar({ ...filtros, status: status.value, page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return

      itens.value = resposta.data
      total.value = resposta.meta.total
      // A página deixou de existir (ex.: desativou o último da página): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        itens.value = []
        total.value = 0
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

  return { busca, status, pagina, porPagina: POR_PAGINA, itens, total, carregando, erro, carregar }
}
