import { api } from './api'
import type {
  FiltrosFornecedores,
  Fornecedor,
  FornecedorAtualizacao,
  FornecedorPayload,
  OpcaoFornecedor,
} from '../types/fornecedor'
import type { Paginado } from '../types/paginado'

export async function listarFornecedores(filtros: FiltrosFornecedores = {}): Promise<Paginado<Fornecedor>> {
  const { data } = await api.get<Paginado<Fornecedor>>('/fornecedores', { params: filtros })
  return data
}

export async function listarFornecedoresAtivos(): Promise<OpcaoFornecedor[]> {
  const { data } = await api.get<OpcaoFornecedor[]>('/fornecedores/opcoes/ativos')
  return data
}

export async function buscarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.get<Fornecedor>(`/fornecedores/${id}`)
  return data
}

export async function criarFornecedor(payload: FornecedorPayload): Promise<Fornecedor> {
  const { data } = await api.post<Fornecedor>('/fornecedores', payload)
  return data
}

export async function atualizarFornecedor(id: number, payload: FornecedorAtualizacao): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}`, payload)
  return data
}

export async function desativarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}/desativar`)
  return data
}

export async function reativarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}/reativar`)
  return data
}
