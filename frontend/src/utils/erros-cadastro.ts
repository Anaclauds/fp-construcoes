import type { ErroApi } from '../services/api'

/** Erro de negócio já em português: a frase e, quando houver, o campo do formulário ao qual ele se refere. */
export interface ErroInterpretado<Campo extends string = string> {
  campo?: Campo
  mensagem: string
}

/**
 * Procura o erro da API na tabela pelo `codigo` (as mensagens do backend vêm sem acento e podem mudar, então nunca
 * são usadas para decidir). Código fora da tabela mantém a mensagem do servidor.
 */
export function interpretarPorCodigo<Campo extends string>(
  tabela: Record<string, ErroInterpretado<Campo>>,
  erro: ErroApi,
): ErroInterpretado<Campo> {
  return tabela[erro.codigo] ?? { mensagem: erro.mensagem }
}
