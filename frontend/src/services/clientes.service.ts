import { api } from './api'
import type {
  Cliente,
  ClienteAtualizacao,
  ClientePayload,
  FiltrosClientes,
  Paginado,
} from '../types'

export async function listarClientes(filtros: FiltrosClientes = {}): Promise<Paginado<Cliente>> {
  const { data } = await api.get<Paginado<Cliente>>('/clientes', { params: filtros })
  return data
}

export async function buscarCliente(id: number): Promise<Cliente> {
  const { data } = await api.get<Cliente>(`/clientes/${id}`)
  return data
}

export async function criarCliente(payload: ClientePayload): Promise<Cliente> {
  const { data } = await api.post<Cliente>('/clientes', payload)
  return data
}

export async function atualizarCliente(id: number, payload: ClienteAtualizacao): Promise<Cliente> {
  const { data } = await api.patch<Cliente>(`/clientes/${id}`, payload)
  return data
}

export async function desativarCliente(id: number): Promise<Cliente> {
  const { data } = await api.patch<Cliente>(`/clientes/${id}/desativar`)
  return data
}

export async function reativarCliente(id: number): Promise<Cliente> {
  const { data } = await api.patch<Cliente>(`/clientes/${id}/reativar`)
  return data
}
