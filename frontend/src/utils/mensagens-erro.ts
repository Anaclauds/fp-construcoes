/**
 * Tradução das mensagens do backend que chegam sem acento ("invalidos", "ja", "nao"), por área.
 *
 * ATENÇÃO: o backend ainda não tem códigos estáveis para estes erros; as chaves abaixo são os códigos
 * gerados (`MODULO_METODO_TIPO_NN`), que mudam se o método for renomeado ou os erros reordenados.
 * É o último recurso: o ideal é o backend enviar a mensagem acentuada ou um código legível. Se uma chave
 * deixar de existir, a mensagem original da API aparece (sem acento, mas correta).
 */

const LOGIN: Record<string, string> = {
  AUTH_LOGIN_UNAUTHORIZED_01: 'CPF ou senha inválidos.',
}

const USUARIOS: Record<string, string> = {
  USUARIOS_CREATE_BADREQUEST_01: 'A senha e a confirmação devem ser iguais.',
  USUARIOS_CREATE_NOTFOUND_01: 'Funcionário não encontrado.',
  USUARIOS_CREATE_BADREQUEST_02: 'Reative o funcionário antes de criar seu usuário.',
  USUARIOS_CREATE_CONFLICT_01: 'Este funcionário já possui usuário cadastrado.',
  USUARIOS_FINDONE_NOTFOUND_01: 'Usuário não encontrado.',
  USUARIOS_UPDATE_BADREQUEST_01: 'Reative o funcionário antes de reativar seu usuário.',
  USUARIOS_UPDATE_BADREQUEST_02: 'A senha e a confirmação devem ser iguais.',
  USUARIOS_REATIVAR_BADREQUEST_01: 'Reative o funcionário antes de reativar seu usuário.',
  USUARIOS_VALIDARPERMISSOES_BADREQUEST_01: 'Não repita o mesmo módulo nas permissões.',
  USUARIOS_PROTEGERULTIMOADMIN_BADREQUEST_01:
    'O último administrador ativo não pode ser desativado nem perder a permissão de Gestão de Usuários.',
}

const FUNCIONARIOS: Record<string, string> = {
  FUNCIONARIOS_FINDONE_NOTFOUND_01: 'Funcionário não encontrado.',
}

const FREQUENCIA: Record<string, string> = {
  FREQUENCIAS_FINDONE_NOTFOUND_01: 'Registro de frequência não encontrado.',
  FREQUENCIAS_SAVE_NOTFOUND_01: 'Usuário responsável pelo registro não encontrado.',
  FREQUENCIAS_RELATORIO_BADREQUEST_01: 'A data inicial deve ser menor ou igual à data final.',
  FREQUENCIAS_RELATORIO_NOTFOUND_01: 'Funcionário não encontrado.',
  FREQUENCIAS_RELATORIO_BADREQUEST_02: 'O relatório deve abranger no máximo dez anos.',
  FREQUENCIAS_VALIDARJUSTIFICATIVAS_BADREQUEST_01: 'Existem funcionários com justificativa pendente.',
  FREQUENCIAS_VALIDARFUNCIONARIOS_BADREQUEST_01: 'Todos os funcionários devem existir e estar ativos.',
}

/** Código do backend -> mensagem em português com acento. */
export const MENSAGEM_POR_CODIGO: Readonly<Record<string, string>> = {
  ...LOGIN,
  ...USUARIOS,
  ...FUNCIONARIOS,
  ...FREQUENCIA,
}
