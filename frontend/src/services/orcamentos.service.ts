import { api } from './api'
import type {
  AprovarOrcamentoPayload,
  FiltrosOrcamentos,
  ListaOrcamentos,
  OpcaoClienteOrcamento,
  OpcaoMaterial,
  OpcaoResponsavel,
  OpcaoServico,
  Orcamento,
  OrcamentoAtualizacao,
  OrcamentoPayload,
  RespostaAprovacao,
  SimulacaoOrcamento,
  SimularOrcamentoPayload,
  StatusDefinivel,
  TipoOrcamento,
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

/** Seletores do orçamento: basta a permissão ORCAMENTOS (visualizar), sem Materiais, Serviços, Clientes ou Funcionários. */
export async function listarOpcoesMateriais(): Promise<OpcaoMaterial[]> {
  const { data } = await api.get<OpcaoMaterial[]>('/orcamentos/opcoes/materiais')
  return data
}

/** Serviços ativos; `tipo` filtra pela categoria (igual ao tipo do orçamento). */
export async function listarOpcoesServicos(tipo?: TipoOrcamento): Promise<OpcaoServico[]> {
  const { data } = await api.get<OpcaoServico[]>('/orcamentos/opcoes/servicos', { params: tipo ? { tipo } : undefined })
  return data
}

/** Clientes ativos (`busca` por nome, razão social, fantasia, cidade ou telefone; `limit` até 200). */
export async function listarClientesParaOrcamento(params: { busca?: string; limit?: number }): Promise<OpcaoClienteOrcamento[]> {
  const { data } = await api.get<OpcaoClienteOrcamento[]>('/orcamentos/opcoes/clientes', { params })
  return data
}

/** Um cliente ativo com endereço. Cliente inativo ou inexistente responde 404. */
export async function buscarClienteParaOrcamento(id: number): Promise<OpcaoClienteOrcamento> {
  const { data } = await api.get<OpcaoClienteOrcamento>(`/orcamentos/opcoes/clientes/${id}`)
  return data
}

/** Funcionários ativos que podem ser responsáveis pelo projeto aprovado. */
export async function listarResponsaveisParaOrcamento(busca?: string): Promise<OpcaoResponsavel[]> {
  const { data } = await api.get<OpcaoResponsavel[]>('/orcamentos/opcoes/responsaveis', {
    params: busca ? { busca } : undefined,
  })
  return data
}

/** Totais calculados pelo backend sem gravar nada (resposta 2xx é só uma prévia, não um orçamento criado). */
export async function simularOrcamento(payload: SimularOrcamentoPayload): Promise<SimulacaoOrcamento> {
  const { data } = await api.post<SimulacaoOrcamento>('/orcamentos/simular', payload)
  return data
}
