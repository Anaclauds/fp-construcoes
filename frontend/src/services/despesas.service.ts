import { api } from './api'
import type { Paginado } from '../types/paginado'
import type {
  Despesa,
  DespesaAtualizacao,
  DespesaPayload,
  EstornoDespesaPayload,
  FiltrosDespesas,
  MaterialOpcaoDespesa,
  RespostaDespesas,
} from '../types/despesa'

export async function listarDespesas(filtros: FiltrosDespesas = {}): Promise<RespostaDespesas> {
  const { data } = await api.get<RespostaDespesas>('/despesas', { params: filtros })
  return data
}

export async function criarDespesa(payload: DespesaPayload): Promise<Despesa> {
  const { data } = await api.post<Despesa>('/despesas', payload)
  return data
}

export async function atualizarDespesa(id: number, payload: DespesaAtualizacao): Promise<Despesa> {
  const { data } = await api.patch<Despesa>(`/despesas/${id}`, payload)
  return data
}

/** Estorno (DESPESAS gerenciar): a despesa é conservada com `canceladoEm` e o caixa recebe a compensação. */
export async function cancelarDespesa(id: number, payload: EstornoDespesaPayload): Promise<Despesa> {
  const { data } = await api.patch<Despesa>(`/despesas/${id}/cancelar`, payload)
  return data
}

export interface FiltrosOpcoesMateriais {
  /** Busca pelo nome do material (a API não procura pelo código nesta rota). */
  busca?: string
  page?: number
  limit?: number
}

/** Materiais ativos para a compra, com saldos (DESPESAS visualizar). Inclui os de saldo zero. */
export async function listarOpcoesMateriaisCompra(
  filtros: FiltrosOpcoesMateriais = {},
): Promise<Paginado<MaterialOpcaoDespesa>> {
  const { data } = await api.get<Paginado<MaterialOpcaoDespesa>>('/despesas/opcoes/materiais', { params: filtros })
  return data
}
