import { api } from './api'
import type {
  AprovarOrcamentoPayload,
  FiltrosOrcamentos,
  ListaOrcamentos,
  OpcaoMaterial,
  OpcaoServico,
  Orcamento,
  OrcamentoAtualizacao,
  OrcamentoPayload,
  RespostaAprovacao,
  StatusDefinivel,
} from '../types'

export async function listarOrcamentos(filtros: FiltrosOrcamentos = {}): Promise<ListaOrcamentos> {
  const { data } = await api.get<ListaOrcamentos>('/orcamentos', { params: filtros })
  return data
}

export async function buscarOrcamento(id: number): Promise<Orcamento> {
  const { data } = await api.get<Orcamento>(`/orcamentos/${id}`)
  return data
}

export async function criarOrcamento(payload: OrcamentoPayload): Promise<Orcamento> {
  const { data } = await api.post<Orcamento>('/orcamentos', payload)
  return data
}

/** PATCH parcial; se `materiais` ou `servicos` forem enviados, a lista inteira é substituída. */
export async function atualizarOrcamento(id: number, payload: OrcamentoAtualizacao): Promise<Orcamento> {
  const { data } = await api.patch<Orcamento>(`/orcamentos/${id}`, payload)
  return data
}

/** APROVADO não passa por aqui: use `aprovarOrcamento`. */
export async function alterarStatusOrcamento(id: number, status: StatusDefinivel): Promise<Orcamento> {
  const { data } = await api.patch<Orcamento>(`/orcamentos/${id}/status`, { status })
  return data
}

export async function aprovarOrcamento(id: number, payload: AprovarOrcamentoPayload): Promise<RespostaAprovacao> {
  const { data } = await api.patch<RespostaAprovacao>(`/orcamentos/${id}/aprovar`, payload)
  return data
}

export async function listarOpcoesMateriais(): Promise<OpcaoMaterial[]> {
  const { data } = await api.get<OpcaoMaterial[]>('/orcamentos/opcoes/materiais')
  return data
}

export async function listarOpcoesServicos(): Promise<OpcaoServico[]> {
  const { data } = await api.get<OpcaoServico[]>('/orcamentos/opcoes/servicos')
  return data
}
