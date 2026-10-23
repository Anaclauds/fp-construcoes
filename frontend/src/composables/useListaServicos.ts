import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import { listarServicos } from '../services/servicos.service'
import type { TipoOrcamento } from '../types'
import type { FiltrosServicos, Servico } from '../types/servico'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300
export type FiltroCategoriaServico = 'TODOS' | TipoOrcamento

/** Lista de serviços com busca (debounce), filtros de categoria e status e paginação do servidor (`status=TODOS` incluído). */
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
      const resposta = await listarServicos({ ...filtros, status: status.value, page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return

      servicos.value = resposta.data
      total.value = resposta.meta.total
      // A página deixou de existir (ex.: desativou o último da página): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
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
