import { computed, shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarProjetos } from '../services/projetos.service'
import type { TipoOrcamento } from '../types/orcamento'
import type { FiltrosProjetos, IndicadoresProjetos, ProjetoResumo, StatusProjeto } from '../types/projeto'
import { termoDeBusca } from '../utils/formatadores'
import { STATUS_PROJETO } from '../utils/projetos'
import { useDebounce } from './useDebounce'
import { useFiltrosNaUrl } from './useFiltrosNaUrl'

// O Figma mostra 4 linhas por página ("Mostrando 4 de 8 registros"): cabem na altura de 856px com as linhas de 76px.
const POR_PAGINA = 4
const ATRASO_BUSCA_MS = 300

export type FiltroStatusProjeto = 'TODOS' | StatusProjeto
export type FiltroTipoProjeto = 'TODOS' | TipoOrcamento

const TIPOS: TipoOrcamento[] = ['CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS']

/**
 * Lista de projetos: busca (debounce), filtros de status e tipo e paginação feita pelo servidor.
 * Busca, status, tipo e página ficam na query string (`?busca=&status=&tipo=&pagina=`): recarregar a página
 * ou voltar de outra tela reabre a lista como estava.
 *
 * Os cartões usam os indicadores filtrados da API (`indicadoresFiltrados`): respeitam busca e tipo, mas não o filtro
 * de status (para os cartões continuarem somando todos os status do recorte).
 */
export function useListaProjetos() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatusProjeto>('TODOS')
  const tipo = shallowRef<FiltroTipoProjeto>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const projetos = shallowRef<ProjetoResumo[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresProjetos | null>(null)
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
      indicadores.value = resposta.indicadoresFiltrados
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

  // Busca, status, tipo e página ficam na URL: recarregar ou voltar de outra tela reabre a lista como estava. Clicar em
  // "Projeto" no menu (`/projetos` sem filtros) zera os filtros. Antes dos `watch` abaixo, para a leitura inicial não consultar duas vezes.
  useFiltrosNaUrl(
    'projetos',
    [
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
        definir: (valor) => (status.value = valor as FiltroStatusProjeto),
        padrao: 'TODOS',
        valido: (valor) => STATUS_PROJETO.includes(valor as StatusProjeto),
      },
      {
        param: 'tipo',
        ler: () => tipo.value,
        definir: (valor) => (tipo.value = valor as FiltroTipoProjeto),
        padrao: 'TODOS',
        valido: (valor) => TIPOS.includes(valor as TipoOrcamento),
      },
    ],
    pagina,
  )

  // Trocar status/tipo/busca devolve a página 1, e o watch de pagina recarrega.
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
    projetos,
    total,
    indicadores,
    carregando,
    erro,
    carregar,
  }
}
