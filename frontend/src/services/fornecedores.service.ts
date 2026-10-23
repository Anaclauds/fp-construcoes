import { api } from './api'
import { criarCacheSessao } from './cache-sessao'
import type {
  FiltrosFornecedores,
  Fornecedor,
  FornecedorAtualizacao,
  FornecedorPayload,
  OpcaoFornecedor,
} from '../types/fornecedor'
import type { Paginado } from '../types/paginado'

export async function listarFornecedores(filtros: FiltrosFornecedores = {}): Promise<Paginado<Fornecedor>> {
  const { data } = await api.get<Paginado<Fornecedor>>('/fornecedores', { params: filtros })
  return data
}

// Fornecedores ativos dos campos "Fornecedor" (material, equipamento, despesa): cache de sessão, limpo por qualquer gravação aqui.
const cacheFornecedoresAtivos = criarCacheSessao(async () => {
  const { data } = await api.get<OpcaoFornecedor[]>('/fornecedores/opcoes/ativos')
  return data
})

export const listarFornecedoresAtivos = () => cacheFornecedoresAtivos.obter()

/** Para quem precisa da lista atualizada na hora (ex.: botão de tentar de novo). */
export const invalidarFornecedoresAtivos = () => cacheFornecedoresAtivos.invalidar()

export async function criarFornecedor(payload: FornecedorPayload): Promise<Fornecedor> {
  const { data } = await api.post<Fornecedor>('/fornecedores', payload)
  invalidarFornecedoresAtivos()
  return data
}

export async function atualizarFornecedor(id: number, payload: FornecedorAtualizacao): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}`, payload)
  invalidarFornecedoresAtivos()
  return data
}

export async function desativarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}/desativar`)
  invalidarFornecedoresAtivos()
  return data
}

export async function reativarFornecedor(id: number): Promise<Fornecedor> {
  const { data } = await api.patch<Fornecedor>(`/fornecedores/${id}/reativar`)
  invalidarFornecedoresAtivos()
  return data
}
