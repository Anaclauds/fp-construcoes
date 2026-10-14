import { shallowRef, type Ref } from 'vue'
import { extrairErro } from '../services/api'
import { buscarCobrancasDoProjeto } from '../services/cobrancas.service'
import type { ProjetoCobrancasDetalhe } from '../types'
import { mensagemCobranca } from '../utils/cobrancas'

/** Projeto com as cobranças e parcelas; `projetoId` inválido (NaN) conta como "sem cobranças". */
export function useProjetoCobrancas(projetoId: Ref<number>) {
  const projeto = shallowRef<ProjetoCobrancasDetalhe | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** 404: o projeto não existe ou ainda não gerou cobranças. */
  const naoEncontrado = shallowRef(false)

  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    erro.value = null
    naoEncontrado.value = false

    if (!Number.isInteger(projetoId.value) || projetoId.value < 1) {
      projeto.value = null
      naoEncontrado.value = true
      return
    }

    carregando.value = true
    try {
      const dados = await buscarCobrancasDoProjeto(projetoId.value)
      if (requisicao === ultimaRequisicao) projeto.value = dados
    } catch (e) {
      if (requisicao !== ultimaRequisicao) return
      const { mensagem, status } = extrairErro(e)
      projeto.value = null
      if (status === 404) naoEncontrado.value = true
      else erro.value = mensagemCobranca(mensagem)
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  return { projeto, carregando, erro, naoEncontrado, carregar }
}
