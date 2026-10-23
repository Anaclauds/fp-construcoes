import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { criarCacheSessao } from '../services/cache-sessao'
import { listarFormasPagamento } from '../services/projetos.service'
import type { FormasPagamentoDaModalidade } from '../types/projeto'

/**
 * Modalidades e formas de pagamento aceitas pelo servidor (`GET /projetos/opcoes/formas-pagamento`).
 * A consulta fica em cache de sessão (ligado ao token) e é reaproveitada por todos os formulários (iniciar, etapa).
 * Em caso de erro nada fica em cache e `carregar()` tenta de novo.
 */
const cacheFormas = criarCacheSessao(listarFormasPagamento)

const formas = shallowRef<FormasPagamentoDaModalidade[]>([])
const carregando = shallowRef(false)
const erro = shallowRef<string | null>(null)

async function carregar(): Promise<void> {
  carregando.value = true
  erro.value = null
  try {
    formas.value = await cacheFormas.obter()
  } catch (e) {
    erro.value = extrairMensagemErro(e)
  } finally {
    carregando.value = false
  }
}

export function useFormasPagamentoProjeto() {
  void carregar()
  return { formas, carregando, erro, carregar }
}
