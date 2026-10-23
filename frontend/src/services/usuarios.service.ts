import { api } from './api'
import type {
  FiltrosUsuarios,
  OpcaoFuncionarioUsuario,
  OpcaoModulo,
  Paginado,
  Usuario,
  UsuarioAtualizacao,
  UsuarioPayload,
} from '../types'

/** Com `page`/`limit` a API devolve `{ data, meta }`; esta função sempre os envia. */
export async function listarUsuarios(filtros: FiltrosUsuarios & { page: number; limit: number }): Promise<Paginado<Usuario>> {
  const { data } = await api.get<Paginado<Usuario>>('/usuarios', { params: filtros })
  return data
}

export async function listarModulos(): Promise<OpcaoModulo[]> {
  const { data } = await api.get<OpcaoModulo[]>('/usuarios/opcoes/modulos')
  return data
}

export async function criarUsuario(payload: UsuarioPayload): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', payload)
  return data
}

export async function atualizarUsuario(id: number, payload: UsuarioAtualizacao): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}`, payload)
  return data
}

export async function desativarUsuario(id: number): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/desativar`)
  return data
}

export async function reativarUsuario(id: number): Promise<Usuario> {
  const { data } = await api.patch<Usuario>(`/usuarios/${id}/reativar`)
  return data
}

/** Funcionários ativos sem usuário (candidatos ao cadastro); exige GESTAO_USUARIOS gerenciar. */
export async function listarFuncionariosElegiveis(): Promise<OpcaoFuncionarioUsuario[]> {
  const { data } = await api.get<OpcaoFuncionarioUsuario[]>('/usuarios/opcoes/funcionarios')
  return data
}
