import { normalizarTexto } from './formatadores'

export const LIMITE_RAZAO_SOCIAL = 180
export const LIMITE_NOME_FANTASIA = 150
export const LIMITE_RESPONSAVEL = 150
export const LIMITE_CARGO = 100
export const LIMITE_CIDADE = 100
export const LIMITE_RUA = 150
export const LIMITE_NUMERO = 20
export const LIMITE_BAIRRO = 100
export const LIMITE_COMPLEMENTO = 150

const MENSAGENS: [RegExp, string][] = [
  [/fornecedor nao encontrado/, 'Fornecedor não encontrado. Atualize a lista.'],
  [/cnpj invalido/, 'CNPJ inválido.'],
  [/cnpj ja cadastrado/, 'CNPJ já cadastrado para outro fornecedor.'],
  [/cep deve conter 8 digitos/, 'CEP inválido. Use 8 dígitos.'],
]

export function mensagemFornecedor(mensagem: string): string {
  const k = normalizarTexto(mensagem)
  return MENSAGENS.find(([padrao]) => padrao.test(k))?.[1] ?? mensagem
}
