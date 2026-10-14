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

/** Máximo de materiais lidos para a compra (PAGINAS_MAXIMAS x LIMITE_API). Acima disso a lista é cortada e a tela avisa. */
export const LIMITE_MATERIAIS_COMPRA = PAGINAS_MAXIMAS * LIMITE_API

/**
 * Materiais ativos (a API pagina em até 100 por chamada). Exige MATERIAIS (visualizar).
 * `truncado` indica que há mais materiais do que o limite lido: o seletor não mostra todos.
 */
export async function listarMateriaisAtivos(): Promise<{ itens: MaterialOpcaoDespesa[]; truncado: boolean }> {
  const itens: MaterialOpcaoDespesa[] = []
  for (let page = 1; page <= PAGINAS_MAXIMAS; page++) {
    const { data } = await api.get<Paginado<MaterialOpcaoDespesa>>('/materiais', {
      params: { status: 'ATIVO', page, limit: LIMITE_API },
    })
    itens.push(...data.data)
    if (page >= data.meta.totalPages) return { itens, truncado: false }
  }
  return { itens, truncado: true }
}
