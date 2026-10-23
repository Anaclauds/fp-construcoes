import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { listarResponsaveisParaOrcamento } from '../services/orcamentos.service'
import type { OpcaoResponsavel } from '../types'

/**
 * Funcionários ativos que podem ser responsáveis por um projeto aprovado (`/orcamentos/opcoes/responsaveis`).
 * Basta a permissão de Orçamentos: não depende de Funcionários nem de Frequência.
 */
export function useResponsaveisOrcamento() {
  const funcionarios = shallowRef<OpcaoResponsavel[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** 403 do servidor: o perfil não pode nem consultar as opções. */
  const semPermissao = shallowRef(false)

  async function carregar() {
    carregando.value = true
    erro.value = null
    semPermissao.value = false
    try {
      funcionarios.value = await listarResponsaveisParaOrcamento()
    } catch (e) {
      const { status, mensagem } = extrairErro(e)
      funcionarios.value = []
      semPermissao.value = status === 403
      erro.value = status === 403 ? null : mensagem
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, semPermissao, carregar }
}
