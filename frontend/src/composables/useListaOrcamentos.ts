import { computed, shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarOrcamentos } from '../services/orcamentos.service'
import type { FiltrosOrcamentos, IndicadoresOrcamentos, Orcamento, StatusOrcamento, TipoOrcamento } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

// O Figma mostra 6 linhas por página ("Mostrando 6 de 8 registros").
const POR_PAGINA = 6
const ATRASO_BUSCA_MS = 300

export type FiltroStatusOrcamento = 'TODOS' | StatusOrcamento
export type FiltroTipoOrcamento = 'TODOS' | TipoOrcamento

/** Lista de orçamentos com busca (debounce), filtros de status e tipo e paginação feita pelo servidor. */
export function useListaOrcamentos() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatusOrcamento>('TODOS')
  const tipo = shallowRef<FiltroTipoOrcamento>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const orcamentos = shallowRef<Orcamento[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresOrcamentos | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  /** A API só informa em aberto, pendentes e em análise; reprovados é o que sobra do "em aberto". */
  const reprovados = computed(() => {
    const i = indicadores.value
    return i ? Math.max(0, i.emAberto - i.pendentes - i.emAnalise) : null
  })

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosOrcamentos = { page: pagina.value, limit: POR_PAGINA }
    // "#0001" e "0001" encontram o mesmo orçamento; o backend remove o # na busca por número.
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (status.value !== 'TODOS') filtros.status = status.value
    if (tipo.value !== 'TODOS') filtros.tipo = tipo.value

    try {
      const resposta = await listarOrcamentos(filtros)
      if (requisicao !== ultimaRequisicao) return

      orcamentos.value = resposta.data
      total.value = resposta.meta.total
      indicadores.value = resposta.indicadores
      // A página deixou de existir (ex.: mudou o status do último da página com filtro ativo): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        orcamentos.value = []
        total.value = 0
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  // Muda a página: busca nova no servidor.
  watch(pagina, () => void carregar())

  // Mudou o critério: volta para a primeira página (o watch acima recarrega) ou recarrega direto.
  watch([buscaAplicada, status, tipo], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return {
    busca,
    status,
    tipo,
    pagina,
    porPagina: POR_PAGINA,
    orcamentos,
    total,
    indicadores,
    reprovados,
    carregando,
    erro,
    carregar,
  }
}
