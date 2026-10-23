import { api } from './api'
import type {
  FiltrosFuncionarios,
  Funcionario,
  FuncionarioAtualizacao,
  FuncionarioPayload,
  Paginado,
} from '../types'

export async function listarFuncionarios(
  filtros: FiltrosFuncionarios = {},
): Promise<Paginado<Funcionario>> {
  const { data } = await api.get<Paginado<Funcionario>>('/funcionarios', { params: filtros })
  return data
}

export async function criarFuncionario(payload: FuncionarioPayload): Promise<Funcionario> {
  const { data } = await api.post<Funcionario>('/funcionarios', payload)
  return data
}

export async function atualizarFuncionario(
  id: number,
  payload: FuncionarioAtualizacao,
): Promise<Funcionario> {
  const { data } = await api.patch<Funcionario>(`/funcionarios/${id}`, payload)
  return data
}

export async function desativarFuncionario(id: number): Promise<Funcionario> {
  const { data } = await api.patch<Funcionario>(`/funcionarios/${id}/desativar`)
  return data
}

export async function reativarFuncionario(id: number): Promise<Funcionario> {
  const { data } = await api.patch<Funcionario>(`/funcionarios/${id}/reativar`)
  return data
}
