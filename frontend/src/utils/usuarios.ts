import type { StatusCadastro, Usuario } from '../types'

/** Usuário de funcionário inativo não acessa o sistema: conta como inativo mesmo com status ATIVO. */
export function statusDoUsuario(usuario: Usuario): StatusCadastro {
  // acessoAtivo (API) = usuário e funcionário ativos; ausente no detalhe, então deriva dos dois status.
  const ativo = usuario.acessoAtivo ?? (usuario.status === 'ATIVO' && usuario.funcionario.status === 'ATIVO')
  return ativo ? 'ATIVO' : 'INATIVO'
}

export function funcionarioInativo(usuario: Usuario): boolean {
  return usuario.funcionario.status !== 'ATIVO'
}
