import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { extrairMensagemErro } from '../services/api'
import { buscarRelatorioCobrancas, listarCobrancas } from '../services/cobrancas.service'
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

const TIPOS: TipoOrcamento[] = ['CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS']
const STATUS: StatusProjetoCobranca[] = ['EM_ABERTO', 'PARCIAL', 'PAGO']

/** Quantos projetos há em cada situação (cartões de indicador). */
export interface ContagemProjetos {
  iniciados: number
  semPagamento: number
  comPagamento: number
}

const primeiro = (valor: LocationQueryValue | LocationQueryValue[] | undefined) =>
  (Array.isArray(valor) ? valor[0] : valor) ?? ''

/**
 * Lista de projetos com cobranças: busca (debounce), filtros de tipo e status e paginação feita pelo servidor.
 * Busca, tipo, status e página ficam na query string da rota (`?busca=&tipo=&status=&pagina=`): ao voltar do
 * detalhe (ou recarregar a página) a lista reaparece exatamente como estava.
 */
export function useListaCobrancas() {
  const route = useRoute()
  const router = useRouter()

  const query = route.query
  const tipoDaUrl = primeiro(query.tipo) as TipoOrcamento
  const statusDaUrl = primeiro(query.status) as StatusProjetoCobranca
  const paginaDaUrl = Number(primeiro(query.pagina))

  const busca = shallowRef(primeiro(query.busca))
  const status = shallowRef<FiltroStatusCobranca>(STATUS.includes(statusDaUrl) ? statusDaUrl : 'TODOS')
  const tipo = shallowRef<FiltroTipoCobranca>(TIPOS.includes(tipoDaUrl) ? tipoDaUrl : 'TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(Number.isInteger(paginaDaUrl) && paginaDaUrl > 1 ? paginaDaUrl : 1)

  const projetos = shallowRef<ProjetoCobrancas[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresCobrancas | null>(null)
  const contagem = shallowRef<ContagemProjetos | null>(null)
  const carregandoContagem = shallowRef(false)
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

  /** Filtros que valem para os cartões: só o tipo (como os indicadores da lista, ignoram busca e status). */
  const filtrosIndicadores = computed<FiltrosCobrancas>(() => (tipo.value === 'TODOS' ? {} : { tipo: tipo.value }))

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
        // Os cartões mostram "—" junto com o erro em vez de ficarem "carregando..." para sempre.
        indicadores.value = null
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  let ultimaContagem = 0

  /**
   * Cartões "N projetos iniciados / não receberam / receberam pagamento": contados a partir de
   * `GET /cobrancas/relatorios` (sem paginação) com o mesmo filtro de tipo dos indicadores da lista.
   * Em aberto = status EM_ABERTO; com pagamento = PARCIAL + PAGO. Falha aqui deixa "—" nos cartões.
   */
  async function carregarContagem() {
    const requisicao = ++ultimaContagem
    carregandoContagem.value = true
    try {
      const { data } = await buscarRelatorioCobrancas(filtrosIndicadores.value)
      if (requisicao !== ultimaContagem) return
      const semPagamento = data.filter((projeto) => projeto.status === 'EM_ABERTO').length
      contagem.value = { iniciados: data.length, semPagamento, comPagamento: data.length - semPagamento }
    } catch {
      if (requisicao === ultimaContagem) contagem.value = null
    } finally {
      if (requisicao === ultimaContagem) carregandoContagem.value = false
    }
  }

  /** Carrega a lista, os indicadores e as contagens (usado na abertura e no "Tentar novamente"). */
  async function carregarTudo() {
    await Promise.all([carregar(), carregarContagem()])
  }

  // Guarda os critérios na URL (replace: não enche o histórico a cada letra digitada).
  function sincronizarUrl() {
    // Já navegou para outra tela (o componente ainda não desmontou): não mexe na URL dela.
    if (route.name !== 'cobrancas') return
    const novos: Record<string, string> = {}
    if (buscaAplicada.value.trim()) novos.busca = buscaAplicada.value.trim()
    if (tipo.value !== 'TODOS') novos.tipo = tipo.value
    if (status.value !== 'TODOS') novos.status = status.value
    if (pagina.value > 1) novos.pagina = String(pagina.value)
    void router.replace({ name: 'cobrancas', query: novos })
  }

  // O tipo muda os cartões de contagem; busca/status/página não.
  watch(tipo, () => void carregarContagem())

  // Muda a página: busca nova no servidor.
  watch(pagina, () => void carregar())

  // Mudou o critério: volta para a primeira página (o watch acima recarrega) ou recarrega direto.
  watch([buscaAplicada, status, tipo], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  watch([buscaAplicada, status, tipo, pagina], sincronizarUrl)

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
    contagem,
    carregandoContagem,
    carregando,
    erro,
    carregar,
    carregarTudo,
  }
}
