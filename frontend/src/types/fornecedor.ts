import type { StatusCadastro } from './funcionario'

/** Fornecedor como a API devolve (cnpj e contato só com dígitos, cep com 8 dígitos). */
export interface Fornecedor {
  id: number
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  contato: string
  responsavel: string
  cargoResponsavel: string
  cep: string
  cidade: string
  estado: string
  rua: string
  numero: string
  bairro: string
  complemento: string | null
  status: StatusCadastro
  /** Só em create/update/detalhe. */
  materiaisPreferenciais?: { id: number; codigo: string; nome: string; status: StatusCadastro }[]
  equipamentos?: { id: number; codigoPatrimonial: string; nome: string; status: StatusCadastro }[]
}

/** Corpo do POST: complemento vazio é omitido. */
export interface FornecedorPayload {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  contato: string
  responsavel: string
  cargoResponsavel: string
  cep: string
  cidade: string
  estado: string
  rua: string
  numero: string
  bairro: string
  complemento?: string
}

/** Corpo do PATCH: só os campos alterados; complemento '' limpa o campo. */
export type FornecedorAtualizacao = Partial<FornecedorPayload>

export interface FiltrosFornecedores {
  busca?: string
  /** `TODOS` só existe em backend que o aceite; sem ele o front junta ativos e inativos. */
  status?: StatusCadastro | 'TODOS'
  page?: number
  limit?: number
}

/** `GET /fornecedores/opcoes/ativos`. */
export interface OpcaoFornecedor {
  id: number
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
}
