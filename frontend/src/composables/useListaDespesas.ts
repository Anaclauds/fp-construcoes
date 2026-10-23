import { computed, shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarDespesas } from '../services/despesas.service'
import type { Despesa, FiltrosDespesas, IndicadoresDespesas, TipoDespesa } from '../types/despesa'
import { dataBrParaIso, termoDeBusca } from '../utils/formatadores'
import { dataBrValida } from '../utils/validacao'
import { ANO_MINIMO_DESPESA, mensagemDespesa } from '../utils/despesas'
import { useDebounce } from './useDebounce'
import { useFiltrosNaUrl } from './useFiltrosNaUrl'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

/** `TODAS` ou o nome de uma categoria do catálogo (também `SEM_CATEGORIA`, para despesas legadas). */
export type FiltroCategoriaDespesa = string
export type FiltroTipoDespesa = 'TODOS' | TipoDespesa

/**
 * Lista de despesas: busca (debounce), categoria, tipo, período (DD/MM/AAAA digitado) e paginação do servidor.
 * Datas incompletas ou inválidas não filtram até ficarem completas; período invertido mostra erro e não consulta.
 */
export function useListaDespesas() {
  const busca = shallowRef('')
  const categoria = shallowRef<FiltroCategoriaDespesa>('TODAS')
  const tipo = shallowRef<FiltroTipoDespesa>('TODOS')
  /** Id do fornecedor filtrado, como texto (`''` = todos). */
  const fornecedorId = shallowRef('')
  const dataInicio = shallowRef('')
  const dataFim = shallowRef('')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const despesas = shallowRef<Despesa[]>([])
  const total = shallowRef(0)
  const indicadores = shallowRef<IndicadoresDespesas | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  /** Nome do fornecedor filtrado, tirado da lista carregada (serve a quem já não está entre os ativos). */
  const nomeFornecedorFiltrado = computed(() => {
    const id = Number(fornecedorId.value)
    return despesas.value.find((d) => d.fornecedor?.id === id)?.fornecedor?.nomeFantasia ?? ''
  })

  const inicioIso = computed(() => (dataBrValida(dataInicio.value, ANO_MINIMO_DESPESA) ? dataBrParaIso(dataInicio.value) : ''))
  const fimIso = computed(() => (dataBrValida(dataFim.value, ANO_MINIMO_DESPESA) ? dataBrParaIso(dataFim.value) : ''))

  const erroInicio = computed(() =>
    dataInicio.value.length === 10 && !inicioIso.value ? 'Data inválida.' : undefined,
  )
  const erroFim = computed(() => {
    if (dataFim.value.length === 10 && !fimIso.value) return 'Data inválida.'
    if (inicioIso.value && fimIso.value && inicioIso.value > fimIso.value) {
      return 'A data final não pode ser anterior à inicial.'
    }
    return undefined
  })

  const temFiltros = computed(
    () =>
      busca.value.trim() !== '' ||
      categoria.value !== 'TODAS' ||
      tipo.value !== 'TODOS' ||
      fornecedorId.value !== '' ||
      dataInicio.value !== '' ||
      dataFim.value !== '',
  )

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  // Busca, categoria, tipo, período e página ficam na URL: recarregar ou voltar de outra tela reabre a lista como estava.
  // As datas só entram na URL quando completas e válidas (a mesma regra que as faz filtrar).
  useFiltrosNaUrl(
    'despesas',
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
        param: 'categoria',
        ler: () => categoria.value,
        definir: (valor) => (categoria.value = valor),
        padrao: 'TODAS',
        // As categorias vêm do catálogo (e podem ser cadastradas): a URL só precisa de um nome plausível.
        valido: (valor) => valor.length <= 100,
      },
      {
        param: 'tipo',
        ler: () => tipo.value,
        definir: (valor) => (tipo.value = valor as FiltroTipoDespesa),
        padrao: 'TODOS',
        valido: (valor) => valor === 'DIVERSA' || valor === 'COMPRA_MATERIAL',
      },
      {
        param: 'fornecedor',
        ler: () => fornecedorId.value,
        definir: (valor) => (fornecedorId.value = valor),
        padrao: '',
        // O fornecedor pode estar inativo (despesa antiga): a URL só precisa de um id inteiro positivo.
        valido: (valor) => /^[1-9]\d{0,9}$/.test(valor),
      },
      {
        param: 'de',
        ler: () => (inicioIso.value ? dataInicio.value : ''),
        definir: (valor) => (dataInicio.value = valor),
        padrao: '',
        valido: (valor) => dataBrValida(valor, ANO_MINIMO_DESPESA),
      },
      {
        param: 'ate',
        ler: () => (fimIso.value ? dataFim.value : ''),
        definir: (valor) => (dataFim.value = valor),
        padrao: '',
        valido: (valor) => dataBrValida(valor, ANO_MINIMO_DESPESA),
      },
    ],
    pagina,
  )

  async function carregar() {
    // Período inválido: nada a consultar (a tela mostra o erro nos campos).
    if (erroInicio.value || erroFim.value) return

    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosDespesas = { page: pagina.value, limit: POR_PAGINA }
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (categoria.value !== 'TODAS') filtros.categoria = categoria.value
    if (tipo.value !== 'TODOS') filtros.tipo = tipo.value
    if (fornecedorId.value) filtros.fornecedorId = Number(fornecedorId.value)
    if (inicioIso.value) filtros.dataInicio = inicioIso.value
    if (fimIso.value) filtros.dataFim = fimIso.value

    try {
      const resposta = await listarDespesas(filtros)
      if (requisicao !== ultimaRequisicao) return
      despesas.value = resposta.data
      total.value = resposta.meta.total
      indicadores.value = resposta.indicadores
      // A página deixou de existir (ex.: filtro encolheu a lista): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        despesas.value = []
        total.value = 0
        indicadores.value = null
        erro.value = mensagemDespesa(extrairMensagemErro(e))
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  function limparFiltros() {
    busca.value = ''
    buscaAplicada.value = ''
    categoria.value = 'TODAS'
    tipo.value = 'TODOS'
    fornecedorId.value = ''
    dataInicio.value = ''
    dataFim.value = ''
  }

  watch(pagina, () => void carregar())

  watch([buscaAplicada, categoria, tipo, fornecedorId, inicioIso, fimIso], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return {
    busca,
    categoria,
    tipo,
    fornecedorId,
    nomeFornecedorFiltrado,
    dataInicio,
    dataFim,
    erroInicio,
    erroFim,
    temFiltros,
    pagina,
    porPagina: POR_PAGINA,
    despesas,
    total,
    indicadores,
    carregando,
    erro,
    carregar,
    limparFiltros,
  }
}
