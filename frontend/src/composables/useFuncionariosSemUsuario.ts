import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarFuncionariosElegiveis } from '../services/usuarios.service'
import type { OpcaoFuncionarioUsuario } from '../types'

/**
 * Funcionários ativos que ainda não têm usuário (candidatos ao cadastro de acesso), via
 * GET /usuarios/opcoes/funcionarios (GESTAO_USUARIOS gerenciar). Só para criar usuário: na edição
 * o vínculo existente não muda, então este seletor não se aplica.
 */
export function useFuncionariosSemUsuario() {
  const funcionarios = shallowRef<OpcaoFuncionarioUsuario[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      funcionarios.value = await listarFuncionariosElegiveis()
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  return { funcionarios, carregando, erro, carregar }
}
