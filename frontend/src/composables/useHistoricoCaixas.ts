import { shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { listarCaixas } from '../services/financeiro.service'
import type { CaixaHistorico } from '../types/caixa'
import { mensagemCaixa } from '../utils/caixa'

const POR_PAGINA = 8

/** Histórico paginado (servidor) dos caixas existentes. Só a última requisição vale. */
export function useHistoricoCaixas() {
  const pagina = shallowRef(1)
  const caixas = shallowRef<CaixaHistorico[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null
    try {
      const resposta = await listarCaixas({ page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return
      caixas.value = resposta.data
      total.value = resposta.meta.total
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        caixas.value = []
        total.value = 0
        const { mensagem, codigo } = extrairErro(e)
        erro.value = mensagemCaixa(mensagem, codigo)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch(pagina, () => void carregar())

  return { pagina, porPagina: POR_PAGINA, caixas, total, carregando, erro, carregar }
}
