export type ModuloSistema =
  | 'GESTAO_USUARIOS'
  | 'GESTAO_FUNCIONARIOS'
  | 'FREQUENCIA'
  | 'CLIENTES'
  | 'ORCAMENTOS'
  | 'COBRANCAS'
  | 'PROJETOS'
  | 'SERVICOS'
  | 'MATERIAIS'
  | 'ESTOQUE'
  | 'EQUIPAMENTOS'
  | 'FORNECEDORES'
  | 'DESPESAS'
  | 'CAIXA'

export type AcaoPermissao = 'visualizar' | 'gerenciar'

export interface Permissao {
  modulo: ModuloSistema
  podeVisualizar: boolean
  podeGerenciar: boolean
}

export interface AuthUser {
  sub: number
  login: string
  funcionarioId: number
  nomeCompleto: string
  permissoes: Permissao[]
}

export interface RespostaLogin {
  accessToken: string
  usuario: AuthUser
}

export interface AlterarSenhaPayload {
  senhaAtual: string
  novaSenha: string
  confirmarNovaSenha: string
}
