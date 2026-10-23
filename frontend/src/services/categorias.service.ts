import { api } from './api'
import { criarCacheSessao } from './cache-sessao'
import type { Categoria, CategoriaPayload, OpcaoSelecao } from '../types/categoria'

// Criação: MATERIAIS ou ESTOQUE gerenciar.
export async function criarCategoriaMaterial(payload: CategoriaPayload): Promise<Categoria> {
  try {
    const { data } = await api.post<Categoria>('/categorias/materiais', payload)
    return data
  } finally {
    // Também no erro (409 de nome repetido): a lista local estava desatualizada.
    cacheCategoriasMaterial.invalidar()
  }
}

// Leitura e criação: DESPESAS visualizar / gerenciar.
// Em cache de sessão: tabela, filtros e modal de despesa pedem o catálogo em sequência.
const cacheCategoriasDespesas = criarCacheSessao(async () => {
  const { data } = await api.get<Categoria[]>('/categorias/despesas')
  return data
})

export const listarCategoriasDespesas = () => cacheCategoriasDespesas.obter()

export async function criarCategoriaDespesa(payload: CategoriaPayload): Promise<Categoria> {
  try {
    const { data } = await api.post<Categoria>('/categorias/despesas', payload)
    return data
  } finally {
    // Também no erro (409 de nome repetido): a lista local estava desatualizada.
    cacheCategoriasDespesas.invalidar()
  }
}

// Opções das listas suspensas de material (MATERIAIS, ESTOQUE ou DESPESAS visualizar).
// Em cache de sessão: formulários e modais abrem em sequência e não precisam repetir as consultas.
const cacheCategoriasMaterial = criarCacheSessao(async () => {
  const { data } = await api.get<OpcaoSelecao[]>('/materiais/opcoes/categorias')
  return data
})

const cacheUnidadesMaterial = criarCacheSessao(async () => {
  const { data } = await api.get<OpcaoSelecao[]>('/materiais/opcoes/unidades')
  return data
})

export const listarOpcoesCategoriasMaterial = () => cacheCategoriasMaterial.obter()

export const listarOpcoesUnidadesMaterial = () => cacheUnidadesMaterial.obter()

/** Material novo pode trazer unidade nova (texto livre na API): a lista de unidades é lida de novo. */
export const invalidarOpcoesUnidadesMaterial = () => cacheUnidadesMaterial.invalidar()
