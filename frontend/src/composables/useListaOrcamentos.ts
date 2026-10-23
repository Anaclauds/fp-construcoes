import { shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarOrcamentos } from '../services/orcamentos.service'
import type { FiltrosOrcamentos, IndicadoresOrcamentos, Orcamento, StatusOrcamento, TipoOrcamento } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'
import { useFiltrosNaUrl } from './useFiltrosNaUrl'

const STATUS_VALIDOS: StatusOrcamento[] = ['PENDENTE', 'EM_ANALISE', 'APROVADO', 'REPROVADO', 'CANCELADO']
const TIPOS_VALIDOS: TipoOrcamento[] = ['CONSTRUCAO_CIVIL', 'SERRALHERIA', 'CALHAS']

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

  /** Os indicadores da API só trazem em aberto (pendentes + em análise); reprovados vêm de uma consulta de 1 registro só para contar. */
  const reprovados = shallowRef<number | null>(null)

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
      // Reprovados respeitam busca e tipo, como os demais cartões, mas não o filtro de status.
      const { page: _pagina, limit: _limite, status: _status, ...semPaginacao } = filtros
      const [resposta, contagemReprovados] = await Promise.all([
        listarOrcamentos(filtros),
        listarOrcamentos({ ...semPaginacao, status: 'REPROVADO', page: 1, limit: 1 }).catch(() => null),
      ])
      if (requisicao !== ultimaRequisicao) return
      reprovados.value = contagemReprovados?.meta.total ?? null

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

  // Busca, status, tipo e página ficam na URL: recarregar (F5) ou voltar de outra tela reabre a lista como estava.
  // Antes dos `watch` abaixo, para a leitura inicial não consultar duas vezes.
  useFiltrosNaUrl(
    'orcamentos',
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
        definir: (valor) => (status.value = valor as FiltroStatusOrcamento),
        padrao: 'TODOS',
        valido: (valor) => STATUS_VALIDOS.includes(valor as StatusOrcamento),
      },
      {
        param: 'tipo',
        ler: () => tipo.value,
        definir: (valor) => (tipo.value = valor as FiltroTipoOrcamento),
        padrao: 'TODOS',
        valido: (valor) => TIPOS_VALIDOS.includes(valor as TipoOrcamento),
      },
    ],
    pagina,
  )

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
