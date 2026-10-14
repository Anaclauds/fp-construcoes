import { api } from './api'
import type { Paginado } from '../types/paginado'
import type { FiltrosServicos, Servico, ServicoAtualizacao, ServicoPayload } from '../types/servico'

export async function listarServicos(filtros: FiltrosServicos = {}): Promise<Paginado<Servico>> {
  const { data } = await api.get<Paginado<Servico>>('/servicos', { params: filtros })
  return data
}

export async function buscarServico(id: number): Promise<Servico> {
  const { data } = await api.get<Servico>(`/servicos/${id}`)
  return data
}

export async function criarServico(payload: ServicoPayload): Promise<Servico> {
  const { data } = await api.post<Servico>('/servicos', payload)
  return data
}

export async function atualizarServico(id: number, payload: ServicoAtualizacao): Promise<Servico> {
  const { data } = await api.patch<Servico>(`/servicos/${id}`, payload)
  return data
}

export async function desativarServico(id: number): Promise<Servico> {
  const { data } = await api.patch<Servico>(`/servicos/${id}/desativar`)
  return data
}

export async function reativarServico(id: number): Promise<Servico> {
  const { data } = await api.patch<Servico>(`/servicos/${id}/reativar`)
  return data
}
