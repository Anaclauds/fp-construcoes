import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarProjeto } from '../services/projetos.service'
import type { ProjetoDetalhe } from '../types/projeto'
import { mensagemProjeto } from '../utils/projetos'

/**
 * Detalhe completo do projeto (`GET /projetos/:id`: orçamento com itens, etapas, extras e cobranças com parcelas).
 * `inicial`: detalhe que a própria ação acabou de devolver (os PATCH respondem com o mesmo formato do GET); com ele a
 * tela não precisa buscar de novo.
 * Os recebimentos de cada parcela (data do pagamento) já vêm no detalhe, então a tela não precisa da permissão de
 * Cobranças para mostrá-los. Etapas e extras cancelados continuam na lista, com `canceladoEm`.
 */
export function useProjetoDetalhe(projetoId: number, inicial?: ProjetoDetalhe | null) {
  const projeto = shallowRef<ProjetoDetalhe | null>(inicial ?? null)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      projeto.value = await buscarProjeto(projetoId)
    } catch (e) {
      projeto.value = null
      const { mensagem, codigo } = extrairErro(e)
      erro.value = mensagemProjeto(mensagem, codigo)
    } finally {
      carregando.value = false
    }
  }

  /**
   * Recarrega sem piscar a tela: mantém o detalhe atual se a consulta falhar (usado depois de uma recusa do servidor,
   * para os saldos na tela acompanharem o que mudou, sem perder o que a pessoa digitou).
   */
  async function atualizar() {
    try {
      projeto.value = await buscarProjeto(projetoId)
      erro.value = null
    } catch {
      // Mantém o detalhe anterior; a recusa do servidor já está visível no formulário.
    }
  }

  return { projeto, carregando, erro, carregar, atualizar }
}
