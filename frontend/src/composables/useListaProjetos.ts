import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router'
import { extrairMensagemErro } from '../services/api'
import { contarProjetosPlanejados, listarProjetos } from '../services/projetos.service'
import type { TipoOrcamento } from '../types/orcamento'
import type { FiltrosProjetos, IndicadoresProjetos, ProjetoResumo, StatusProjeto } from '../types/projeto'
import { termoDeBusca } from '../utils/formatadores'
import { STATUS_PROJETO } from '../utils/projetos'
import { useDebounce } from './useDebounce'

// O Figma mostra 4 linhas por página ("Mostrando 4 de 8 registros"): cabem na altura de 856px com as linhas de 76px.
const POR_PAGINA = 4
const ATRASO_BUSCA_MS = 300

export type FiltroStatusProjeto = 'TODOS' | StatusProjeto
export type FiltroTipoProjeto = 'TODOS' | TipoOrcamento

const TIPOS: TipoOrcamento[] = ['CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS']

const primeiro = (valor: LocationQueryValue | LocationQueryValue[] | undefined) =>
  (Array.isArray(valor) ? valor[0] : valor) ?? ''

interface EstadoLista {
  busca: string
  status: FiltroStatusProjeto
  tipo: FiltroTipoProjeto
  pagina: number
}

/** Estado da lista a partir da query; parâmetros inválidos ou ausentes viram o padrão. */
function lerQuery(query: LocationQuery): EstadoLista {
  const statusDaUrl = primeiro(query.status) as StatusProjeto
  const tipoDaUrl = primeiro(query.tipo) as TipoOrcamento
  const paginaDaUrl = Number(primeiro(query.pagina))
  return {
    busca: primeiro(query.busca).trim(),
    status: STATUS_PROJETO.includes(statusDaUrl) ? statusDaUrl : 'TODOS',
    tipo: TIPOS.includes(tipoDaUrl) ? tipoDaUrl : 'TODOS',
    pagina: Number.isInteger(paginaDaUrl) && paginaDaUrl > 1 ? paginaDaUrl : 1,
  }
}

/** Query canônica do estado: só o que difere do padrão. */
function paraQuery(estado: EstadoLista): Record<string, string> {
  const novos: Record<string, string> = {}
  if (estado.busca.trim()) novos.busca = estado.busca.trim()
  if (estado.status !== 'TODOS') novos.status = estado.status
  if (estado.tipo !== 'TODOS') novos.tipo = estado.tipo
  if (estado.pagina > 1) novos.pagina = String(estado.pagina)
  return novos
}

function querysIguais(a: LocationQuery, b: Record<string, string>): boolean {
  const chaves = Object.keys(a)
  return chaves.length === Object.keys(b).length && chaves.every((chave) => a[chave] === b[chave])
}

/**
 * Lista de projetos: busca (debounce), filtros de status e tipo e paginação feita pelo servidor.
 * Busca, status, tipo e página ficam na query string (`?busca=&status=&tipo=&pagina=`): recarregar a página
 * ou voltar de outra tela reabre a lista como estava.
 *
 * Os cartões usam os indicadores globais da API (total, em execução, concluídos; ignoram os filtros).
 * "Planejados" não vem no payload: é lido de `GET /projetos?status=PLANEJADO&limit=1` (meta.total).
 */
export function useListaProjetos() {
  const route = useRoute()
  const router = useRouter()

  const inicial = lerQuery(route.query)

  const busca = shallowRef(inicial.busca)
  const status = shallowRef<FiltroStatusProjeto>(inicial.status)
  const tipo = shallowRef<FiltroTipoProjeto>(inicial.tipo)
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(inicial.pagina)

  const projetos = shallowRef<ProjetoResumo[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresProjetos | null>(null)
  const planejados = shallowRef<number | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  const filtros = computed<FiltrosProjetos>(() => {
    const atuais: FiltrosProjetos = {}
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
      const resposta = await listarProjetos({ ...filtros.value, page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return

      projetos.value = resposta.data
      total.value = resposta.meta.total
      indicadores.value = resposta.indicadores
      // A página deixou de existir (ex.: filtrou e sobrou menos): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        projetos.value = []
        total.value = 0
        indicadores.value = null
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  let ultimaContagem = 0

  /** Cartão "Planejado": falha aqui deixa "—" no cartão sem derrubar a lista. */
  async function carregarPlanejados() {
    const requisicao = ++ultimaContagem
    try {
      const quantidade = await contarProjetosPlanejados()
      if (requisicao === ultimaContagem) planejados.value = quantidade
    } catch {
      if (requisicao === ultimaContagem) planejados.value = null
    }
  }

  /** Lista, indicadores e contagem de planejados (abertura da tela, "Tentar novamente" e depois de cada ação). */
  async function carregarTudo() {
    await Promise.all([carregar(), carregarPlanejados()])
  }

  function estadoAtual(): EstadoLista {
    return { busca: buscaAplicada.value, status: status.value, tipo: tipo.value, pagina: pagina.value }
  }

  function sincronizarUrl() {
    // Já navegou para outra tela (o componente ainda não desmontou): não mexe na URL dela.
    if (route.name !== 'projetos') return
    const novos = paraQuery(estadoAtual())
    if (!querysIguais(route.query, novos)) void router.replace({ name: 'projetos', query: novos })
  }

  /**
   * A URL mudou por fora (ex.: clicar "Projeto" no menu, que abre `/projetos` sem filtros, ou um link com
   * query): a lista passa a refletir a URL. Parâmetros inválidos são normalizados na própria URL.
   */
  function aplicarQuery(query: LocationQuery) {
    if (route.name !== 'projetos') return
    const alvo = lerQuery(query)
    const atual = estadoAtual()
    if (alvo.busca !== atual.busca.trim()) {
      busca.value = alvo.busca
      buscaAplicada.value = alvo.busca // na hora: senão a URL voltaria a receber a busca antiga
    }
    if (alvo.status !== atual.status) status.value = alvo.status
    if (alvo.tipo !== atual.tipo) tipo.value = alvo.tipo
    if (alvo.pagina !== atual.pagina) pagina.value = alvo.pagina

    const canonica = paraQuery(alvo)
    if (!querysIguais(query, canonica)) void router.replace({ name: 'projetos', query: canonica })
  }

  // Trocar status/tipo/busca devolve a página 1, e o watch de pagina recarrega.
  watch(() => route.query, aplicarQuery)
  aplicarQuery(route.query)

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
    projetos,
    total,
    indicadores,
    planejados,
    carregando,
    erro,
    carregar,
    carregarTudo,
  }
}
