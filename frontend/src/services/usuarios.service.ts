import { api } from './api'
import type {
  FiltrosUsuarios,
  OpcaoModulo,
  Usuario,
  UsuarioAtualizacao,
  UsuarioPayload,
} from '../types'

export async function listarUsuarios(filtros: FiltrosUsuarios = {}): Promise<Usuario[]> {
  const { data } = await api.get<Usuario[]>('/usuarios', { params: filtros })
  return data
}

export async function buscarUsuario(id: number): Promise<Usuario> {
  const { data } = await api.get<Usuario>(`/usuarios/${id}`)
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
