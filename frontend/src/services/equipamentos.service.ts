import { api } from './api'
import type {
  Equipamento,
  EquipamentoAtualizacao,
  EquipamentoPayload,
  FiltrosEquipamentos,
} from '../types/equipamento'
import type { Paginado } from '../types/paginado'

export async function listarEquipamentos(filtros: FiltrosEquipamentos = {}): Promise<Paginado<Equipamento>> {
  const { data } = await api.get<Paginado<Equipamento>>('/equipamentos', { params: filtros })
  return data
}

export async function criarEquipamento(payload: EquipamentoPayload): Promise<Equipamento> {
  const { data } = await api.post<Equipamento>('/equipamentos', payload)
  return data
}

export async function atualizarEquipamento(id: number, payload: EquipamentoAtualizacao): Promise<Equipamento> {
  const { data } = await api.patch<Equipamento>(`/equipamentos/${id}`, payload)
  return data
}

export async function desativarEquipamento(id: number): Promise<Equipamento> {
  const { data } = await api.patch<Equipamento>(`/equipamentos/${id}/desativar`)
  return data
}

export async function reativarEquipamento(id: number): Promise<Equipamento> {
  const { data } = await api.patch<Equipamento>(`/equipamentos/${id}/reativar`)
  return data
}
