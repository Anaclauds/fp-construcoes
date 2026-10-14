import type { StatusCadastro } from './funcionario'

export interface MaterialFornecedorResumo {
  id: number
  nomeFantasia: string
  razaoSocial: string
  status: StatusCadastro
}

/** Material como a API devolve; preço chega como texto decimal ("18.5"). */
export interface Material {
  id: number
  codigo: string
  nome: string
  categoria: string
  unidadeMedida: string
  descricao: string | null
  precoReferencia: string
  fornecedorPreferencialId: number | null
  status: StatusCadastro
  fornecedorPreferencial: MaterialFornecedorResumo | null
  estoque: {
    materialId: number
    quantidadeAtual: string
    quantidadeReservada: string
    atualizadoEm: string
  } | null
}

/** Corpo do POST: descrição vazia e fornecedor ausente são omitidos. */
export interface MaterialPayload {
  nome: string
  categoria: string
  unidadeMedida: string
  descricao?: string
  precoReferencia: number
  fornecedorPreferencialId?: number
}

/** Corpo do PATCH: só o que mudou; descrição '' limpa o campo. */
export type MaterialAtualizacao = Partial<Omit<MaterialPayload, 'fornecedorPreferencialId'>> & {
  fornecedorPreferencialId?: number | null
}

export interface FiltrosMateriais {
  busca?: string
  categoria?: string
  status?: StatusCadastro | 'TODOS'
  page?: number
  limit?: number
}
