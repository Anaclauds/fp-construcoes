import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarProjeto } from '../services/projetos.service'
import type { ProjetoDetalhe } from '../types/projeto'
import { mensagemProjeto } from '../utils/projetos'

/**
 * Detalhe completo do projeto (`GET /projetos/:id`: orçamento com itens, etapas, extras e cobranças com parcelas).
 * Os recebimentos de cada parcela (data do pagamento) já vêm no detalhe, então a tela não precisa da permissão de
 * Cobranças para mostrá-los. Etapas e extras cancelados continuam na lista, com `canceladoEm`.
 */
export function useProjetoDetalhe(projetoId: number) {
  const projeto = shallowRef<ProjetoDetalhe | null>(null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      projeto.value = await buscarProjeto(projetoId)
    } catch (e) {
      projeto.value = null
      erro.value = mensagemProjeto(extrairErro(e).mensagem)
    } finally {
      carregando.value = false
    }
  }

  return { projeto, carregando, erro, carregar }
}
