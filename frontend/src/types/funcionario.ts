export type StatusCadastro = 'ATIVO' | 'INATIVO'

export interface UsuarioDoFuncionario {
  id: number
  login: string
  status: StatusCadastro
}

export interface Funcionario {
  id: number
  nomeCompleto: string
  apelido: string | null
  cpf: string
  dataNascimento: string
  sexo: string
  celular: string
  cep: string
  cidade: string
  estado: string
  rua: string
  numero: string
  bairro: string
  complemento: string | null
  funcao: string
  setorAtuacao: string
  /** Decimal em string, como vem da API. */
  salario: string
  tipoContrato: string
  dataContratacao: string
  contatoEmergencia: string
  nomeContatoEmergencia: string
  grauVinculo: string
  status: StatusCadastro
  usuario: UsuarioDoFuncionario | null
}

/** Datas em YYYY-MM-DD; cpf, celular, cep e contato so com digitos. */
export interface FuncionarioPayload {
  nomeCompleto: string
  apelido?: string
  cpf: string
  dataNascimento: string
  sexo: string
  celular: string
  cep: string
  cidade: string
  estado: string
  rua: string
  numero: string
  bairro: string
  complemento?: string
  funcao: string
  setorAtuacao: string
  salario: number
  tipoContrato: string
  dataContratacao: string
  contatoEmergencia: string
  nomeContatoEmergencia: string
  grauVinculo: string
}

export type FuncionarioAtualizacao = Partial<FuncionarioPayload>

export interface FiltrosFuncionarios {
  busca?: string
  status?: StatusCadastro
  page?: number
  limit?: number
}
