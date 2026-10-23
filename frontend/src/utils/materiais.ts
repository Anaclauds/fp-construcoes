import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { OpcaoSelecao } from '../types/categoria'
import type { ErroApi } from '../services/api'
import { interpretarPorCodigo, type ErroInterpretado } from './erros-cadastro'
import { mascararMoeda, normalizarTexto } from './formatadores'

/** Limites do DTO de material no backend (nome 180, categoria 100, unidade 50, descrição 1000). */
export const LIMITE_NOME_MATERIAL = 180
export const LIMITE_CATEGORIA_MATERIAL = 100
export const LIMITE_UNIDADE_MATERIAL = 50
export const LIMITE_DESCRICAO_MATERIAL = 1000
/** DECIMAL(12,2): maior preço aceito pela API. */
export const VALOR_MAXIMO_MATERIAL = 9_999_999_999.99

/** Unidades de reserva: só entram na lista se `/materiais/opcoes/unidades` não responder (a API aceita texto livre; o valor salvo é o próprio rótulo). */
export const UNIDADES_MATERIAL = [
  'Unidade',
  'Metro Linear',
  'Metro Quadrado (m²)',
  'Metro Cúbico (m³)',
  'Quilograma (kg)',
  'Litro (L)',
  'Barra',
  'Peça',
  'Caixa',
  'Rolo',
  'Saco (20kg)',
  'Cento',
  'Lata (3,6L)',
]

/** Símbolo curto usado nas quantidades do estoque ("100 m"). */
const SIMBOLOS: Record<string, string> = {
  unidade: 'un',
  un: 'un',
  unid: 'un',
  'metro linear': 'm',
  'metro': 'm',
  ml: 'm',
  m: 'm',
  'metro quadrado (m²)': 'm²',
  'metro quadrado': 'm²',
  m2: 'm²',
  'm²': 'm²',
  'metro cubico (m³)': 'm³',
  'metro cubico': 'm³',
  m3: 'm³',
  'm³': 'm³',
  'quilograma (kg)': 'kg',
  quilograma: 'kg',
  quilo: 'kg',
  kg: 'kg',
  'litro (l)': 'L',
  litro: 'L',
  l: 'L',
  peca: 'pç',
}

/** Equivalências de grafias antigas (siglas e variações) com a opção da lista. */
const EQUIVALENTES: Record<string, string> = {
  un: 'Unidade',
  unid: 'Unidade',
  ml: 'Metro Linear',
  metro: 'Metro Linear',
  m: 'Metro Linear',
  m2: 'Metro Quadrado (m²)',
  'metro quadrado': 'Metro Quadrado (m²)',
  m3: 'Metro Cúbico (m³)',
  'metro cubico': 'Metro Cúbico (m³)',
  kg: 'Quilograma (kg)',
  quilo: 'Quilograma (kg)',
  quilograma: 'Quilograma (kg)',
  litro: 'Litro (L)',
  l: 'Litro (L)',
  peca: 'Peça',
}

function chave(texto: string): string {
  return normalizarTexto(texto)
}

/** Valor salvo -> opção equivalente da lista (ignora caixa e acento); sem equivalente devolve o texto como está. */
function paraOpcao(valor: string, lista: string[], equivalentes: Record<string, string>): string {
  const k = chave(valor)
  return lista.find((o) => chave(o) === k) ?? equivalentes[k] ?? valor.trim()
}

export const unidadeParaOpcao = (valor: string) => paraOpcao(valor, UNIDADES_MATERIAL, EQUIVALENTES)
/** A categoria é o próprio texto cadastrado no catálogo: só tira espaços das pontas. */
export const categoriaParaOpcao = (valor: string) => valor.trim()

/** Opções do select a partir do catálogo (`valor`/`rotulo`) + o valor atual do cadastro, caso não esteja no catálogo (legado). */
export function opcoesDeCatalogo(catalogo: OpcaoSelecao[], atual?: string): OpcaoCampo[] {
  const lista: OpcaoCampo[] = catalogo.map(({ valor, rotulo }) => ({ valor, rotulo }))
  if (atual && !lista.some((o) => o.valor === atual)) lista.push({ valor: atual, rotulo: atual })
  return lista
}

/** Unidade como aparece nas telas: "Metro linear" -> "Metro Linear", "UN" -> "Unidade"; desconhecida fica como está. */
export function rotuloUnidade(unidade: string): string {
  return unidadeParaOpcao(unidade)
}

/** Símbolo da unidade para quantidades ("m", "m²", "un"); sem símbolo conhecido usa o nome sem o que vem entre parênteses. */
export function simboloUnidade(unidade: string): string {
  const k = chave(unidade)
  const conhecido = SIMBOLOS[k] ?? SIMBOLOS[chave(unidadeParaOpcao(unidade))]
  if (conhecido) return conhecido
  return unidade.replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase()
}

/** Digitação em centavos até 12 dígitos ("1850" -> "R$ 18,50"), como o DECIMAL(12,2) da API. */
export const mascararValorMaterial = (valor: string) => mascararMoeda(valor, 12)

/** Campo do formulário de material ao qual um erro de negócio se refere. */
export type CampoErroMaterial = 'nome' | 'fornecedor'

/**
 * Erros de negócio de materiais, decididos pelo `codigo` (as mensagens da API vêm sem acento e podem mudar).
 * Os terminados em `_01` são gerados pelo nome do método no backend (`materiais.service.ts`); não há código
 * legível para eles, então ficam listados aqui, num só lugar, e precisam acompanhar o backend.
 */
const ERROS_MATERIAL: Record<string, ErroInterpretado<CampoErroMaterial>> = {
  MATERIAIS_FINDONE_NOTFOUND_01: { mensagem: 'Material não encontrado. Atualize a lista.' },
  ESTOQUE_FINDONE_NOTFOUND_01: { mensagem: 'Material não encontrado. Atualize a lista.' },
  MATERIAL_INATIVO: { mensagem: 'Material não encontrado ou inativo. Atualize a lista.' },
  MATERIAIS_VALIDARNOME_CONFLICT_01: { campo: 'nome', mensagem: 'Já existe um material ativo com este nome.' },
  MATERIAIS_ENSUREFORNECEDORATIVO_NOTFOUND_01: {
    campo: 'fornecedor',
    mensagem: 'O fornecedor escolhido não está mais ativo. Escolha outro ou deixe em branco.',
  },
  MATERIAIS_UPDATESTATUS_CONFLICT_01: {
    mensagem: 'Este material tem reserva ativa em projeto e não pode ser desativado agora.',
  },
}

/** Frase e campo de um erro da API de material; código desconhecido mantém a mensagem do servidor. */
export const interpretarErroMaterial = (erro: ErroApi): ErroInterpretado<CampoErroMaterial> =>
  interpretarPorCodigo(ERROS_MATERIAL, erro)

/** Mensagem para o usuário (modais de ativar/desativar, que não têm campos). */
export const mensagemMaterial = (erro: ErroApi): string => interpretarErroMaterial(erro).mensagem
