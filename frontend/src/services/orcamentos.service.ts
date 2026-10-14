import { api, endpointInexistente } from './api'
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

/**
 * Opções para quem tem só o módulo Orçamentos (clientes e responsáveis sem acesso a Clientes/Funcionários).
 * Backend sem essas rotas responde 404 de rota: `null` avisa o chamador para usar o caminho antigo
 * (`/clientes`, `/funcionarios`), e a ausência fica lembrada para não repetir a chamada.
 */
const rotaIndisponivel = { clientes: false, responsaveis: false }

async function tentarOpcao<T>(chave: keyof typeof rotaIndisponivel, chamada: () => Promise<T>): Promise<T | null> {
  if (rotaIndisponivel[chave]) return null
  try {
    return await chamada()
  } catch (e) {
    if (!endpointInexistente(e)) throw e
    rotaIndisponivel[chave] = true
    return null
  }
}

export function listarClientesParaOrcamento(params: { busca?: string; limit?: number }) {
  return tentarOpcao('clientes', async () => {
    const { data } = await api.get<OpcaoClienteOrcamento[]>('/orcamentos/opcoes/clientes', { params })
    return data
  })
}

/** Um 404 de registro (cliente inativo/inexistente) é erro de verdade; só o 404 de rota vira `null`. */
export function buscarClienteParaOrcamento(id: number) {
  return tentarOpcao('clientes', async () => {
    const { data } = await api.get<OpcaoClienteOrcamento>(`/orcamentos/opcoes/clientes/${id}`)
    return data
  })
}

export function listarResponsaveisParaOrcamento() {
  return tentarOpcao('responsaveis', async () => {
    const { data } = await api.get<OpcaoResponsavel[]>('/orcamentos/opcoes/responsaveis')
    return data
  })
}
