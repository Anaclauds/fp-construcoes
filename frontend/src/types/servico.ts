import type { StatusCadastro } from './funcionario'
import type { TipoOrcamento } from './orcamento'

/** Serviço como a API devolve; `valorReferencia` chega como texto decimal ("350.00"). */
export interface Servico {
  id: number
  nome: string
  categoria: TipoOrcamento
  descricao: string | null
  valorReferencia: string
  unidadeMedida: string
  status: StatusCadastro
}

/** Corpo do POST: descrição vazia é omitida. */
export interface ServicoPayload {
  nome: string
  categoria: TipoOrcamento
  descricao?: string
  valorReferencia: number
  unidadeMedida: string
}

/** Corpo do PATCH: só os campos alterados; descrição '' limpa o campo (a API grava null). */
export type ServicoAtualizacao = Partial<ServicoPayload>

export interface FiltrosServicos {
  busca?: string
  categoria?: TipoOrcamento
  status?: StatusCadastro
  page?: number
  limit?: number
}
