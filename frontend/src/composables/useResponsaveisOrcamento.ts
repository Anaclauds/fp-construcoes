import { shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { listarResponsaveisParaOrcamento } from '../services/orcamentos.service'
import { type FuncionarioOpcao, useTodosFuncionarios } from './useTodosFuncionarios'

/**
 * Funcionários que podem ser responsáveis por um projeto aprovado. Usa `/orcamentos/opcoes/responsaveis`
 * (só ativos; basta o módulo Orçamentos). Em backend sem essa rota, usa a listagem de Funcionários/Frequência
 * (`useTodosFuncionarios`), que depende dessas permissões.
 */
export function useResponsaveisOrcamento() {
  const antigo = useTodosFuncionarios()
  const usandoAntigo = shallowRef(false)
  const funcionarios = shallowRef<FuncionarioOpcao[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const semPermissao = shallowRef(false)

  async function carregar() {
    carregando.value = true
    erro.value = null
    semPermissao.value = false
    try {
      const lista = await listarResponsaveisParaOrcamento()
      if (lista) {
        usandoAntigo.value = false
        funcionarios.value = lista.map((f) => ({ ...f, status: 'ATIVO' as const }))
        carregando.value = false
        return
      }
    } catch (e) {
      erro.value = extrairErro(e).mensagem
      carregando.value = false
      return
    }

    usandoAntigo.value = true
    await antigo.carregar()
    funcionarios.value = antigo.funcionarios.value
    erro.value = antigo.erro.value
    semPermissao.value = antigo.semPermissao.value
    carregando.value = false
  }

  return { funcionarios, carregando, erro, semPermissao, carregar }
}
