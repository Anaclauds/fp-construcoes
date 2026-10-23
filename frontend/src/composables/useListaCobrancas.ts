import { computed, shallowRef, watch } from 'vue'
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
import { useFiltrosNaUrl } from './useFiltrosNaUrl'

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

/**
 * Lista de projetos com cobranças: busca (debounce), filtros de tipo e status e paginação feita pelo servidor.
 * Busca, tipo, status e página ficam na query string da rota (`?busca=&tipo=&status=&pagina=`): ao voltar do
 * detalhe (ou recarregar a página) a lista reaparece exatamente como estava.
 */
export function useListaCobrancas() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatusCobranca>('TODOS')
  const tipo = shallowRef<FiltroTipoCobranca>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

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

  /**
   * Filtros que valem para os cartões: busca e tipo, sem o status. É o mesmo recorte dos indicadores de valor da lista
   * (o backend os calcula com busca e tipo, ignorando status), então os cartões acompanham a busca digitada.
   */
  const filtrosIndicadores = computed<FiltrosCobrancas>(() => {
    const { busca: termo, tipo: tipoAtual } = filtros.value
    return { ...(termo ? { busca: termo } : {}), ...(tipoAtual ? { tipo: tipoAtual } : {}) }
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
   * `GET /cobrancas/relatorios` (sem paginação) com a mesma busca e o mesmo tipo da lista (o status não entra: os
   * cartões mostram a divisão entre os estados).
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

  // Busca, tipo, status e página ficam na URL (`?busca=&tipo=&status=&pagina=`, replace: não enche o histórico a cada
  // letra digitada). Antes dos `watch` abaixo, para a leitura inicial não consultar duas vezes.
  useFiltrosNaUrl(
    'cobrancas',
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
        param: 'tipo',
        ler: () => tipo.value,
        definir: (valor) => (tipo.value = valor as FiltroTipoCobranca),
        padrao: 'TODOS',
        valido: (valor) => TIPOS.includes(valor as TipoOrcamento),
      },
      {
        param: 'status',
        ler: () => status.value,
        definir: (valor) => (status.value = valor as FiltroStatusCobranca),
        padrao: 'TODOS',
        valido: (valor) => STATUS.includes(valor as StatusProjetoCobranca),
      },
    ],
    pagina,
  )

  // Busca e tipo mudam os cartões de contagem; status e página não.
  watch([buscaAplicada, tipo], () => void carregarContagem())

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
    contagem,
    carregandoContagem,
    carregando,
    erro,
    carregar,
    carregarTudo,
  }
}
