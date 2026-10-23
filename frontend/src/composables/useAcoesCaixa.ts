import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { abrirCaixa, fecharCaixa, reabrirCaixa } from '../services/financeiro.service'
import type { Caixa } from '../types/caixa'
import { mensagemCaixa, mensagemDeCaixaDesatualizado } from '../utils/caixa'

const MENSAGEM_NAO_ABERTO = 'Este mês ainda não foi aberto. Abra o caixa primeiro.'

/** Ações de escrita do caixa (abrir, fechar e reabrir), com mensagens de erro tratadas. */
export function useAcoesCaixa() {
  const executando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** A última ação foi recusada porque o caixa já mudou (fechado/aberto em outra tela, ou com lançamentos). */
  const desatualizado = shallowRef(false)

  async function executar<T>(acao: () => Promise<T>): Promise<T | null> {
    // Sem clique duplo: uma ação em andamento bloqueia a seguinte.
    if (executando.value) return null
    executando.value = true
    erro.value = null
    desatualizado.value = false
    try {
      return await acao()
    } catch (e) {
      const { mensagem, status } = extrairErro(e)
      erro.value = mensagemCaixa(mensagem)
      desatualizado.value = status === 409 && mensagemDeCaixaDesatualizado(mensagem)
      return null
    } finally {
      executando.value = false
    }
  }

  /** Fechar e reabrir só valem para caixa existente: competência não aberta tem `id: 0`. */
  function comCaixaExistente(id: number, acao: () => Promise<Caixa>): Promise<Caixa | null> {
    if (!(id > 0)) {
      erro.value = MENSAGEM_NAO_ABERTO
      return Promise.resolve(null)
    }
    return executar(acao)
  }

  const fechar = (id: number) => comCaixaExistente(id, () => fecharCaixa(id))

  const reabrir = (id: number) => comCaixaExistente(id, () => reabrirCaixa(id))

  /**
   * Abre a competência ou redefine o valor inicial. Havendo caixa anterior, o servidor usa o saldo herdado
   * e ignora `valor` (a tela não o pede nesse caso e envia 0, que o DTO exige).
   */
  const abrir = (competencia: string, valor: number) => executar(() => abrirCaixa(competencia, valor))

  return { executando, erro, desatualizado, abrir, fechar, reabrir }
}
