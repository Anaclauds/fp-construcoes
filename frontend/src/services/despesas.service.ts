import { api } from './api'
import type { Paginado } from '../types/paginado'
import type {
  Despesa,
  DespesaAtualizacao,
  DespesaPayload,
  FiltrosDespesas,
  MaterialOpcaoDespesa,
  RespostaDespesas,
} from '../types/despesa'

const LIMITE_API = 100
const PAGINAS_MAXIMAS = 20

export async function listarDespesas(filtros: FiltrosDespesas = {}): Promise<RespostaDespesas> {
  const { data } = await api.get<RespostaDespesas>('/despesas', { params: filtros })
  return data
}

export async function buscarDespesa(id: number): Promise<Despesa> {
  const { data } = await api.get<Despesa>(`/despesas/${id}`)
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

/** Todos os materiais ativos (a API pagina em até 100 por chamada). Exige MATERIAIS (visualizar). */
export async function listarMateriaisAtivos(): Promise<MaterialOpcaoDespesa[]> {
  const itens: MaterialOpcaoDespesa[] = []
  for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
    const { data } = await api.get<Paginado<MaterialOpcaoDespesa>>('/materiais', {
      params: { status: 'ATIVO', page, limit: LIMITE_API },
    })
    itens.push(...data.data)
    if (page >= data.meta.totalPages) break
  }
  return itens
}
