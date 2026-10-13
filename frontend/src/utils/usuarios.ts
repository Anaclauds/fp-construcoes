import type { StatusCadastro, Usuario } from '../types'

/** Usuário de funcionário inativo não acessa o sistema: conta como inativo mesmo com status ATIVO. */
export function statusDoUsuario(usuario: Usuario): StatusCadastro {
  return usuario.funcionario.status !== 'ATIVO' ? 'INATIVO' : usuario.status
}

export function funcionarioInativo(usuario: Usuario): boolean {
  return usuario.funcionario.status !== 'ATIVO'
}
