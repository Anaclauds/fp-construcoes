import { api } from './api'
import type { Caixa, FiltrosRecebimentos, RelatorioRecebimentos } from '../types/caixa'

/**
 * Consulta o caixa do mês (AAAA-MM). Atenção: a API CRIA o caixa (valor inicial 0) se ele não existir
 * e, estando aberto, lança recebimentos e despesas do mês que ainda não estão no caixa.
 */
export async function consultarCaixa(competencia: string): Promise<Caixa> {
  const { data } = await api.get<Caixa>('/financeiro/caixa', { params: { competencia } })
  return data
}

/** Cria o caixa ou redefine o valor inicial (enquanto aberto). Valor em reais com 2 casas. */
export async function abrirCaixa(competencia: string, valorInicial: number): Promise<Caixa> {
  const { data } = await api.post<Caixa>('/financeiro/caixa/abrir', { competencia, valorInicial })
  return data
}

export async function fecharCaixa(id: number): Promise<Caixa> {
  const { data } = await api.patch<Caixa>(`/financeiro/caixa/${id}/fechar`)
  return data
}

/** Só existe no backend atualizado; no antigo responde 404 "Cannot PATCH" (ver `reaberturaIndisponivel`). */
export async function reabrirCaixa(id: number): Promise<Caixa> {
  const { data } = await api.patch<Caixa>(`/financeiro/caixa/${id}/reabrir`)
  return data
}

export async function buscarRelatorioRecebimentos(filtros: FiltrosRecebimentos = {}): Promise<RelatorioRecebimentos> {
  const { data } = await api.get<RelatorioRecebimentos>('/financeiro/relatorios/recebimentos', { params: filtros })
  return data
}
