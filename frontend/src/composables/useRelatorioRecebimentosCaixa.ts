import { computed, shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { buscarRelatorioRecebimentos } from '../services/financeiro.service'
import type { RelatorioRecebimentos } from '../types/caixa'
import { dataBrParaIso, isoParaDataBr } from '../utils/formatadores'
import { dataBrValida } from '../utils/validacao'
import { mensagemCaixa } from '../utils/caixa'

const POR_PAGINA = 8

/** Último dia do mês de uma competência AAAA-MM, em ISO. */
function ultimoDiaIso(competencia: string): string {
  const [ano, mes] = competencia.split('-').map(Number) as [number, number]
  const dia = new Date(ano, mes, 0).getDate()
  return `${competencia}-${String(dia).padStart(2, '0')}`
}

/**
 * Relatório de recebimentos (Cobranças) de um período, que começa no mês exibido no caixa. As datas são
 * digitadas em DD/MM/AAAA; só período completo, válido e em ordem consulta a API. O relatório é paginado pelo servidor.
 */
export function useRelatorioRecebimentosCaixa(competencia: string) {
  const dataInicio = shallowRef(isoParaDataBr(`${competencia}-01`))
  const dataFim = shallowRef(isoParaDataBr(ultimoDiaIso(competencia)))
  const pagina = shallowRef(1)

  const relatorio = shallowRef<RelatorioRecebimentos | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  const inicioIso = computed(() => (dataBrValida(dataInicio.value, 2000) ? dataBrParaIso(dataInicio.value) : ''))
  const fimIso = computed(() => (dataBrValida(dataFim.value, 2000) ? dataBrParaIso(dataFim.value) : ''))

  /** Data ausente, incompleta ou inexistente: o relatório anterior deixa de valer e o campo explica o que falta. */
  const erroData = (texto: string, iso: string) => {
    if (iso) return undefined
    return texto.trim() === '' ? 'Informe a data.' : texto.length < 10 ? 'Data incompleta. Use DD/MM/AAAA.' : 'Data inválida.'
  }
  const erroInicio = computed(() => erroData(dataInicio.value, inicioIso.value))
  const erroFim = computed(() => {
    const invalida = erroData(dataFim.value, fimIso.value)
    if (invalida) return invalida
    if (inicioIso.value && fimIso.value && inicioIso.value > fimIso.value) {
      return 'A data final não pode ser anterior à inicial.'
    }
    return undefined
  })
  const periodoValido = computed(() => !erroInicio.value && !erroFim.value)

  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    if (!periodoValido.value) {
      // Período incompleto ou invertido: descarta a consulta em andamento e o resultado do período anterior.
      relatorio.value = null
      erro.value = null
      carregando.value = false
      return
    }
    carregando.value = true
    erro.value = null
    try {
      const resposta = await buscarRelatorioRecebimentos({
        dataInicio: inicioIso.value,
        dataFim: fimIso.value,
        page: pagina.value,
        limit: POR_PAGINA,
      })
      if (requisicao !== ultimaRequisicao) return
      relatorio.value = resposta
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        relatorio.value = null
        erro.value = mensagemCaixa(extrairMensagemErro(e))
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch(pagina, () => void carregar())
  watch([inicioIso, fimIso, periodoValido], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return {
    dataInicio,
    dataFim,
    inicioIso,
    fimIso,
    erroInicio,
    erroFim,
    periodoValido,
    pagina,
    porPagina: POR_PAGINA,
    relatorio,
    carregando,
    erro,
    carregar,
  }
}
