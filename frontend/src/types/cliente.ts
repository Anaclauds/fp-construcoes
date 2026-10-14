import type { StatusCadastro } from './funcionario'

export type TipoCliente = 'PF' | 'PJ'

/** Cliente como a API devolve: sem `tipo` é cadastro rápido (só nome, telefone, cidade e estado). */
export interface Cliente {
  id: number
  nome: string
  telefone: string
  cidade: string
  estado: string
  tipo: TipoCliente | null
  /** CPF (11 dígitos) ou CNPJ (14 dígitos), só números. */
  cpfCnpj: string | null
  email: string | null
  apelido: string | null
  dataNascimento: string | null
  sexo: string | null
  razaoSocial: string | null
  nomeFantasia: string | null
  responsavel: string | null
  cargoResponsavel: string | null
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  complemento: string | null
  cadastroCompleto: boolean
  status: StatusCadastro
}

/** Corpo do POST/PATCH: datas em YYYY-MM-DD; telefone, cpfCnpj e cep só com dígitos. */
export interface ClientePayload {
  telefone: string
  nome?: string
  cidade?: string
  estado?: string
  tipo?: TipoCliente
  cpfCnpj?: string
  email?: string
  apelido?: string | null
  dataNascimento?: string | null
  sexo?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  responsavel?: string | null
  cargoResponsavel?: string | null
  cep?: string
  rua?: string
  numero?: string
  bairro?: string
  complemento?: string | null
}

export type ClienteAtualizacao = Partial<ClientePayload>

export interface FiltrosClientes {
  busca?: string
  tipo?: TipoCliente
  status?: StatusCadastro
  page?: number
  limit?: number
}

/** Endereço devolvido por `GET /enderecos/cep/:cep`. */
export interface EnderecoCep {
  rua: string
  bairro: string
  cidade: string
  estado: string
}
