import { computed, shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarCobrancas } from '../services/cobrancas.service'
import type {
  FiltrosCobrancas,
  IndicadoresCobrancas,
  ProjetoCobrancas,
  StatusProjetoCobranca,
  TipoOrcamento,
} from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

// O Figma mostra 5 linhas por página ("Mostrando 5 de 8 registros").
const POR_PAGINA = 5
const ATRASO_BUSCA_MS = 300

export type FiltroStatusCobranca = 'TODOS' | StatusProjetoCobranca
export type FiltroTipoCobranca = 'TODOS' | TipoOrcamento

/** Lista de projetos com cobranças: busca (debounce), filtros de tipo e status e paginação feita pelo servidor. */
export function useListaCobrancas() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatusCobranca>('TODOS')
  const tipo = shallowRef<FiltroTipoCobranca>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const projetos = shallowRef<ProjetoCobrancas[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresCobrancas | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  /** Filtros ativos sem paginação: a lista e a exportação do relatório usam os mesmos. */
  const filtros = computed<FiltrosCobrancas>(() => {
    const atuais: FiltrosCobrancas = {}
    // "#0001" e "0001" encontram o mesmo projeto.
    const termo = termoDeBusca(buscaAplicada.value.trim().replace(/^#/, ''))
    if (termo) atuais.busca = termo
    if (status.value !== 'TODOS') atuais.status = status.value
    if (tipo.value !== 'TODOS') atuais.tipo = tipo.value
    return atuais
  })

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    try {
      const resposta = await listarCobrancas({ ...filtros.value, page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return

      projetos.value = resposta.data
      total.value = resposta.meta.total
      indicadores.value = resposta.indicadores
      // A página deixou de existir: volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        projetos.value = []
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
    filtros,
    projetos,
    total,
    indicadores,
    carregando,
    erro,
    carregar,
  }
}
