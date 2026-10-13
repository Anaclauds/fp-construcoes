import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { buscarCobranca } from '../services/cobrancas.service'
import type { Cobranca } from '../types'

/** Cobrança completa (com quem registrou cada recebimento), carregada ao montar o componente. */
export function useCobrancaDetalhe(id: number) {
  const cobranca = shallowRef<Cobranca | null>(null)
  const carregando = shallowRef(true)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      cobranca.value = await buscarCobranca(id)
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  void carregar()

  return { cobranca, carregando, erro, carregar }
}
