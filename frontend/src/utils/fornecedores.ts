import type { ErroApi } from '../services/api'
import { interpretarPorCodigo, type ErroInterpretado } from './erros-cadastro'

export const LIMITE_RAZAO_SOCIAL = 180
export const LIMITE_NOME_FANTASIA = 150
export const LIMITE_RESPONSAVEL = 150
export const LIMITE_CARGO = 100
export const LIMITE_CIDADE = 100
export const LIMITE_RUA = 150
export const LIMITE_NUMERO = 20
export const LIMITE_BAIRRO = 100
export const LIMITE_COMPLEMENTO = 150

/** Campo do formulário de fornecedor citado por um erro de negócio (mesmos nomes do DTO). */
export type CampoErroFornecedor = 'nomeFantasia' | 'cnpj' | 'cep'

/**
 * Erros de negócio de fornecedores decididos pelo `codigo` (`fornecedores.service.ts`). Os terminados em `_01` são
 * gerados pelo nome do método no backend; não há código legível para eles e precisam acompanhar o backend.
 */
const ERROS_FORNECEDOR: Record<string, ErroInterpretado<CampoErroFornecedor>> = {
  FORNECEDORES_FINDONE_NOTFOUND_01: { mensagem: 'Fornecedor não encontrado. Atualize a lista.' },
  FORNECEDORES_NORMALIZECNPJ_BADREQUEST_01: { campo: 'cnpj', mensagem: 'CNPJ inválido.' },
  CPF_CNPJ_DUPLICADO: { campo: 'cnpj', mensagem: 'CNPJ já cadastrado para outro fornecedor.' },
  CEP_INVALIDO: { campo: 'cep', mensagem: 'CEP inválido. Use 8 dígitos.' },
  FORNECEDOR_NOME_DUPLICADO: { campo: 'nomeFantasia', mensagem: 'Já existe um fornecedor ativo com este nome fantasia.' },
}

export const interpretarErroFornecedor = (erro: ErroApi): ErroInterpretado<CampoErroFornecedor> =>
  interpretarPorCodigo(ERROS_FORNECEDOR, erro)

/** Mensagem para o usuário (modais de ativar/desativar, que não têm campos). */
export const mensagemFornecedor = (erro: ErroApi): string => interpretarErroFornecedor(erro).mensagem

/** Nome do fornecedor já vinculado a um cadastro; se foi inativado depois, o vínculo histórico continua visível e marcado. */
export function rotuloFornecedorVinculado(fornecedor: { nomeFantasia: string; status?: string } | null | undefined): string {
  if (!fornecedor) return ''
  return fornecedor.status === 'INATIVO' ? `${fornecedor.nomeFantasia} (inativo)` : fornecedor.nomeFantasia
}
