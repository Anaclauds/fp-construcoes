import type { ModuloSistema } from './auth'
import type { StatusCadastro } from './funcionario'

export interface PermissaoUsuario {
  id: number
  modulo: ModuloSistema
  podeVisualizar: boolean
  podeGerenciar: boolean
}

export interface PermissaoPayload {
  modulo: ModuloSistema
  podeVisualizar: boolean
  podeGerenciar: boolean
}

export interface FuncionarioResumo {
  id: number
  nomeCompleto: string
  cpf: string
  celular: string
  funcao: string
  status: StatusCadastro
}

export interface Usuario {
  id: number
  funcionarioId: number
  login: string
  status: StatusCadastro
  ultimoAcesso: string | null
  /** Usuário e funcionário ativos. Só vem na listagem; no detalhe/edição fica ausente. */
  acessoAtivo?: boolean
  funcionario: FuncionarioResumo
  permissoes: PermissaoUsuario[]
}

export interface UsuarioPayload {
  funcionarioId: number
  senha: string
  confirmarSenha: string
  permissoes?: PermissaoPayload[]
}

/** senha e confirmarSenha devem ir juntas; permissoes substitui todas. */
export interface UsuarioAtualizacao {
  senha?: string
  confirmarSenha?: string
  status?: StatusCadastro
  permissoes?: PermissaoPayload[]
}

export interface FiltrosUsuarios {
  busca?: string
  status?: StatusCadastro
  page?: number
  limit?: number
}

export interface OpcaoModulo {
  valor: ModuloSistema
  rotulo: string
  /** Grupo do menu (ex.: "Gestão de Pessoas"). */
  grupo: string
}

/** Funcionário elegível a ganhar usuário (GET /usuarios/opcoes/funcionarios). */
export interface OpcaoFuncionarioUsuario {
  id: number
  nomeCompleto: string
  cpf: string
  funcao: string
  setorAtuacao: string
}
