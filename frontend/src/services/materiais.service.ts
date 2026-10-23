import { api } from './api'
import { criarCacheSessao } from './cache-sessao'
import { invalidarOpcoesUnidadesMaterial } from './categorias.service'
import type { FiltrosMateriais, Material, MaterialAtualizacao, MaterialPayload } from '../types/material'
import type { Paginado } from '../types/paginado'

export async function listarMateriais(filtros: FiltrosMateriais = {}): Promise<Paginado<Material>> {
  const { data } = await api.get<Paginado<Material>>('/materiais', { params: filtros })
  return data
}

export async function buscarMaterial(id: number): Promise<Material> {
  const { data } = await api.get<Material>(`/materiais/${id}`)
  return data
}

export async function criarMaterial(payload: MaterialPayload): Promise<Material> {
  const { data } = await api.post<Material>('/materiais', payload)
  invalidarCachesDeMaterial()
  return data
}

export async function atualizarMaterial(id: number, payload: MaterialAtualizacao): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}`, payload)
  invalidarCachesDeMaterial()
  return data
}

export async function desativarMaterial(id: number): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}/desativar`)
  invalidarCachesDeMaterial()
  return data
}

export async function reativarMaterial(id: number): Promise<Material> {
  const { data } = await api.patch<Material>(`/materiais/${id}/reativar`)
  invalidarCachesDeMaterial()
  return data
}

/** Status dos materiais considerados ao montar a lista de categorias em uso. */
export type StatusCategoriasEmUso = 'ATIVO' | 'TODOS'

export interface CategoriasEmUso {
  /** Categorias gravadas nos materiais lidos, sem repetição. */
  categorias: string[]
  /** Falso quando havia mais materiais que o limite de páginas lidas: pode faltar categoria na lista (a busca textual continua achando tudo). */
  completo: boolean
}

const POR_PAGINA_CATEGORIAS = 100
const LIMITE_PAGINAS_CATEGORIAS = 20
const PAGINAS_EM_PARALELO = 4

/**
 * O backend não expõe as categorias em uso: elas são montadas lendo `GET /materiais`. Lê a página 1 para saber
 * quantas existem e busca as demais em lotes paralelos (até 4 por vez), no máximo `LIMITE_PAGINAS_CATEGORIAS`.
 */
async function coletarCategoriasEmUso(status: StatusCategoriasEmUso): Promise<CategoriasEmUso> {
  const categorias = new Set<string>()
  const somar = (materiais: Material[]) => {
    for (const material of materiais) {
      const nome = material.categoria.trim()
      if (nome !== '') categorias.add(nome)
    }
  }

  const primeira = await listarMateriais({ status, page: 1, limit: POR_PAGINA_CATEGORIAS })
  somar(primeira.data)

  const totalPaginas = primeira.meta.totalPages
  const ultima = Math.min(totalPaginas, LIMITE_PAGINAS_CATEGORIAS)
  const restantes = Array.from({ length: Math.max(0, ultima - 1) }, (_, i) => i + 2)
  for (let i = 0; i < restantes.length; i += PAGINAS_EM_PARALELO) {
    const lote = restantes.slice(i, i + PAGINAS_EM_PARALELO)
    const respostas = await Promise.all(lote.map((page) => listarMateriais({ status, page, limit: POR_PAGINA_CATEGORIAS })))
    for (const resposta of respostas) somar(resposta.data)
  }

  return { categorias: [...categorias], completo: totalPaginas <= LIMITE_PAGINAS_CATEGORIAS }
}

// Uma consulta por sessão e status: abrir a tela de novo reaproveita a lista até alguém cadastrar/editar material.
const cacheEmUso: Record<StatusCategoriasEmUso, ReturnType<typeof criarCacheSessao<CategoriasEmUso>>> = {
  ATIVO: criarCacheSessao(() => coletarCategoriasEmUso('ATIVO')),
  TODOS: criarCacheSessao(() => coletarCategoriasEmUso('TODOS')),
}

/** Categorias gravadas nos materiais (só ativos ou todos), em cache de sessão. */
export function listarCategoriasEmUso(status: StatusCategoriasEmUso): Promise<CategoriasEmUso> {
  return cacheEmUso[status].obter()
}

/**
 * Cadastrar, editar, ativar ou desativar material muda as categorias em uso e pode trazer unidade nova
 * (texto livre na API): as próximas consultas dessas listas leem de novo.
 */
export function invalidarCachesDeMaterial() {
  cacheEmUso.ATIVO.invalidar()
  cacheEmUso.TODOS.invalidar()
  invalidarOpcoesUnidadesMaterial()
}
