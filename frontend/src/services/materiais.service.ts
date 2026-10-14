import { api } from './api'
import type { FiltrosMateriais, Material, MaterialAtualizacao, MaterialPayload } from '../types/material'
import type { Paginado } from '../types/paginado'

export async function listarMateriais(filtros: FiltrosMateriais = {}): Promise<Paginado<Material>> {
  const { data } = await api.get<Paginado<Material>>('/materiais', { params: filtros })
  return data
}

export async function buscarMaterial(id: number): Promise<Material> {
  const { data } = await api.get<Material>(`/materiais/${id}`)
  return data
}

export async function criarMaterial(payload: MaterialPayload): Promise<Material> {
  const { data } = await api.post<Material>('/materiais', payload)
  return data
}

export async function atualizarMaterial(id: number, payload: MaterialAtualizacao): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}`, payload)
  return data
}

export async function desativarMaterial(id: number): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}/desativar`)
  return data
}

export async function reativarMaterial(id: number): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}/reativar`)
  return data
}
