import { api } from './api'
import type {
  FiltrosFolha,
  FiltrosRelatorio,
  FolhaFrequencia,
  Frequencia,
  RelatorioFrequencia,
  SalvarFolhaPayload,
} from '../types'

/** Folha do dia: todos os funcionários ativos, com ou sem registro. */
export async function buscarFolhaDoDia(filtros: FiltrosFolha = {}): Promise<FolhaFrequencia> {
  const { data } = await api.get<FolhaFrequencia>('/frequencias', { params: filtros })
  return data
}

/** Upsert em lote. No erro de justificativa, use extrairErro().funcionariosPendentes. */
export async function salvarFolha(payload: SalvarFolhaPayload): Promise<FolhaFrequencia> {
  const { data } = await api.post<FolhaFrequencia>('/frequencias', payload)
  return data
}

export async function buscarFrequencia(id: number): Promise<Frequencia> {
  const { data } = await api.get<Frequencia>(`/frequencias/${id}`)
  return data
}

export async function atualizarObservacao(id: number, observacao: string): Promise<Frequencia> {
  const { data } = await api.patch<Frequencia>(`/frequencias/${id}/observacao`, { observacao })
  return data
}

export async function buscarRelatorio(filtros: FiltrosRelatorio): Promise<RelatorioFrequencia> {
  const { data } = await api.get<RelatorioFrequencia>('/frequencias/relatorio', { params: filtros })
  return data
}
