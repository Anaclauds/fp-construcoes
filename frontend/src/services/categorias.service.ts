import { api } from './api'
import type { Categoria, CategoriaPayload, OpcaoSelecao } from '../types/categoria'

// Leitura: MATERIAIS, ESTOQUE ou DESPESAS visualizar. Criação: MATERIAIS ou ESTOQUE gerenciar.
export async function listarCategoriasMateriais(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/categorias/materiais')
  return data
}

export async function criarCategoriaMaterial(payload: CategoriaPayload): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias/materiais', payload)
  return data
}

// Leitura e criação: DESPESAS visualizar / gerenciar.
export async function listarCategoriasDespesas(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/categorias/despesas')
  return data
}

export async function criarCategoriaDespesa(payload: CategoriaPayload): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/categorias/despesas', payload)
  return data
}

// Opções das listas suspensas de material (MATERIAIS, ESTOQUE ou DESPESAS visualizar).
export async function listarOpcoesCategoriasMaterial(): Promise<OpcaoSelecao[]> {
  const { data } = await api.get<OpcaoSelecao[]>('/materiais/opcoes/categorias')
  return data
}

export async function listarOpcoesUnidadesMaterial(): Promise<OpcaoSelecao[]> {
  const { data } = await api.get<OpcaoSelecao[]>('/materiais/opcoes/unidades')
  return data
}
