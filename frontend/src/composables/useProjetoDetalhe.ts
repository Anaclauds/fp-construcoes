import { computed, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarCobrancasDoProjeto } from '../services/cobrancas.service'
import { buscarProjeto } from '../services/projetos.service'
import type { Recebimento } from '../types/cobranca'
import type { ProjetoDetalhe } from '../types/projeto'
import { mensagemProjeto } from '../utils/projetos'
import { useAuth } from './useAuth'

/**
 * Detalhe completo do projeto (`GET /projetos/:id`: orçamento com itens, etapas, extras e cobranças com parcelas).
 *
 * Os recebimentos (data do pagamento) só existem em `GET /cobrancas/projetos/:id`, que exige a permissão de
 * Cobranças. Sem ela, ou se a consulta falhar, a tela mostra só as parcelas e o status delas
 * (`recebimentosDisponiveis` fica falso e `recebimentosDaParcela` devolve lista vazia).
 *
 * `comRecebimentos: false` pula essa segunda consulta (ex.: formulário de etapa, que só precisa das etapas).
 */
export function useProjetoDetalhe(projetoId: number, { comRecebimentos = true }: { comRecebimentos?: boolean } = {}) {
  const { temPermissao } = useAuth()

  const projeto = shallowRef<ProjetoDetalhe | null>(null)
  const recebimentos = shallowRef<Map<number, Recebimento[]>>(new Map())
  const recebimentosDisponiveis = shallowRef(false)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  const podeVerRecebimentos = computed(() => temPermissao('COBRANCAS', 'visualizar'))

  async function carregarRecebimentos() {
    recebimentosDisponiveis.value = false
    recebimentos.value = new Map()
    if (!comRecebimentos || !podeVerRecebimentos.value) return
    // Sem cobranças não há o que receber (e a API responde 404): nem consulta.
    if (projeto.value && projeto.value.cobrancas.length === 0) {
      recebimentosDisponiveis.value = true
      return
    }
    try {
      const resposta = await buscarCobrancasDoProjeto(projetoId)
      const mapa = new Map<number, Recebimento[]>()
      for (const cobranca of resposta.cobrancas) {
        for (const parcela of cobranca.parcelas) mapa.set(parcela.id, parcela.recebimentos)
      }
      recebimentos.value = mapa
      recebimentosDisponiveis.value = true
    } catch (e) {
      // 404: nenhuma cobrança encontrada. Outros erros: segue sem as datas de pagamento.
      recebimentosDisponiveis.value = extrairErro(e).status === 404
    }
  }

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      projeto.value = await buscarProjeto(projetoId)
      await carregarRecebimentos()
    } catch (e) {
      projeto.value = null
      erro.value = mensagemProjeto(extrairErro(e).mensagem)
    } finally {
      carregando.value = false
    }
  }

  function recebimentosDaParcela(parcelaId: number): Recebimento[] {
    return recebimentos.value.get(parcelaId) ?? []
  }

  return { projeto, carregando, erro, recebimentosDisponiveis, podeVerRecebimentos, recebimentosDaParcela, carregar }
}
