import { shallowRef } from 'vue'
import { endpointInexistente, extrairErro } from '../services/api'
import { abrirCaixa, fecharCaixa, reabrirCaixa } from '../services/financeiro.service'
import type { Caixa } from '../types/caixa'
import { mensagemCaixa, mensagemDeCaixaDesatualizado } from '../utils/caixa'

/**
 * A reabertura só existe no backend atualizado. No antigo a rota não existe (404 "Cannot PATCH"): a primeira
 * tentativa descobre isso e o botão some pelo resto da sessão. Escopo de módulo: vale para todas as telas.
 */
const reaberturaIndisponivel = shallowRef(false)

export class ReaberturaIndisponivelError extends Error {
  constructor() {
    super('A reabertura de caixa não está disponível neste servidor.')
  }
}

/** Ações de escrita do caixa (fechar, redefinir o valor inicial e reabrir), com mensagens de erro tratadas. */
export function useAcoesCaixa() {
  const executando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** A última ação foi recusada porque o caixa já está no estado pedido (alterado em outra tela). */
  const desatualizado = shallowRef(false)

  async function executar<T>(acao: () => Promise<T>): Promise<T | null> {
    executando.value = true
    erro.value = null
    desatualizado.value = false
    try {
      return await acao()
    } catch (e) {
      if (e instanceof ReaberturaIndisponivelError) erro.value = e.message
      else {
        const { mensagem, status } = extrairErro(e)
        erro.value = mensagemCaixa(mensagem)
        desatualizado.value = status === 409 && mensagemDeCaixaDesatualizado(mensagem)
      }
      return null
    } finally {
      executando.value = false
    }
  }

  const fechar = (id: number) => executar(() => fecharCaixa(id))

  const definirValorInicial = (competencia: string, valor: number) => executar(() => abrirCaixa(competencia, valor))

  const reabrir = (id: number): Promise<Caixa | null> =>
    executar(async () => {
      try {
        return await reabrirCaixa(id)
      } catch (e) {
        if (endpointInexistente(e)) {
          reaberturaIndisponivel.value = true
          throw new ReaberturaIndisponivelError()
        }
        throw e
      }
    })

  return { executando, erro, desatualizado, fechar, definirValorInicial, reabrir, reaberturaIndisponivel }
}
