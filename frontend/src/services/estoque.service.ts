import { api } from './api'
import { invalidarCachesDeMaterial } from './materiais.service'
import type {
  AjusteEstoquePayload,
  DetalheEstoque,
  FiltrosEstoque,
  NovoMaterialEstoquePayload,
  RespostaEstoque,
} from '../types/estoque'
import type { Material } from '../types/material'

export async function listarEstoque(filtros: FiltrosEstoque = {}): Promise<RespostaEstoque> {
  const { data } = await api.get<RespostaEstoque>('/estoque', { params: filtros })
  return data
}

export async function buscarDetalheEstoque(materialId: number): Promise<DetalheEstoque> {
  const { data } = await api.get<DetalheEstoque>(`/estoque/${materialId}`)
  return data
}

export async function criarMaterialNoEstoque(payload: NovoMaterialEstoquePayload): Promise<Material> {
  const { data } = await api.post<Material>('/estoque/materiais', payload)
  invalidarCachesDeMaterial()
  return data
}

export async function ajustarEstoque(materialId: number, payload: AjusteEstoquePayload): Promise<DetalheEstoque> {
  const { data } = await api.post<DetalheEstoque>(`/estoque/${materialId}/ajustes`, payload)
  return data
}
