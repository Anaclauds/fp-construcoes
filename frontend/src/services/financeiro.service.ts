import { api } from './api'
import type { Caixa, CaixaHistorico, FiltrosHistoricoCaixas, FiltrosRecebimentos, RelatorioRecebimentos } from '../types/caixa'
import type { Paginado } from '../types/paginado'

/**
 * Consulta o caixa do mês (AAAA-MM) sem criá-lo. Competência ainda não aberta volta com `id: 0` e `naoAberto`
 * (a abertura é explícita, em `abrirCaixa`). Só lê: não altera o caixa nem gera movimentações.
 */
export async function consultarCaixa(competencia: string): Promise<Caixa> {
  const { data } = await api.get<Caixa>('/financeiro/caixa', { params: { competencia } })
  return data
}

/**
 * Abre o caixa do mês ou redefine o valor inicial (caixa aberto e sem movimentos). O DTO exige `valorInicial`
 * (em reais, 2 casas), mas havendo caixa anterior o servidor ignora o valor e herda o saldo final do mês anterior,
 * que precisa estar fechado. Mês futuro é recusado.
 */
export async function abrirCaixa(competencia: string, valorInicial: number): Promise<Caixa> {
  const { data } = await api.post<Caixa>('/financeiro/caixa/abrir', { competencia, valorInicial })
  return data
}

/**
 * Só caixa existente (`id` > 0), de mês encerrado e com os anteriores já fechados. Ao fechar, o servidor reúne no
 * caixa os recebimentos e despesas do mês que ainda não estavam nele.
 */
export async function fecharCaixa(id: number): Promise<Caixa> {
  const { data } = await api.patch<Caixa>(`/financeiro/caixa/${id}/fechar`)
  return data
}

/** Reabre um caixa fechado (auditado); exige que não exista caixa posterior. */
export async function reabrirCaixa(id: number): Promise<Caixa> {
  const { data } = await api.patch<Caixa>(`/financeiro/caixa/${id}/reabrir`)
  return data
}

export async function buscarRelatorioRecebimentos(filtros: FiltrosRecebimentos = {}): Promise<RelatorioRecebimentos> {
  const { data } = await api.get<RelatorioRecebimentos>('/financeiro/relatorios/recebimentos', { params: filtros })
  return data
}

/** Histórico dos caixas existentes (CAIXA visualizar), do mais recente ao mais antigo. Não abre competências. */
export async function listarCaixas(filtros: FiltrosHistoricoCaixas = {}): Promise<Paginado<CaixaHistorico>> {
  const { data } = await api.get<Paginado<CaixaHistorico>>('/financeiro/caixas', { params: filtros })
  return data
}
