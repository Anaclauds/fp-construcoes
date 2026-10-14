import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { mascararMoeda, normalizarTexto } from './formatadores'

/** Limites do cadastro (colunas da API). A descrição é TEXT no banco: o limite do front evita textos absurdos. */
export const LIMITE_NOME_MATERIAL = 180
export const LIMITE_CATEGORIA_MATERIAL = 100
export const LIMITE_UNIDADE_MATERIAL = 50
export const LIMITE_DESCRICAO_MATERIAL = 1000
/** DECIMAL(12,2): maior preço aceito pela API. */
export const VALOR_MAXIMO_MATERIAL = 9_999_999_999.99

/**
 * Categorias oferecidas na tela. A API guarda texto livre e não tem lista de opções, então o front fixa uma
 * lista única para cadastro, edição e filtros (Consultar Material e Gerenciar Estoque).
 */
export const CATEGORIAS_MATERIAL = [
  'Aço e Metais',
  'Alumínio',
  'Fixação e Ferragem',
  'Vedação',
  'Pintura',
  'Ferramenta',
  'Outros',
]

/** Unidades oferecidas (a API aceita texto livre; o valor salvo é o próprio rótulo). */
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
export const categoriaParaOpcao = (valor: string) => paraOpcao(valor, CATEGORIAS_MATERIAL, {})

/** Lista de opções do select + o valor legado (texto livre antigo), para o cadastro antigo não se perder. */
function opcoesCom(lista: string[], atual?: string): OpcaoCampo[] {
  const base = atual && !lista.includes(atual) ? [...lista, atual] : lista
  return base.map((valor) => ({ valor, rotulo: valor }))
}

export const opcoesCategoria = (atual?: string) => opcoesCom(CATEGORIAS_MATERIAL, atual)
export const opcoesUnidade = (atual?: string) => opcoesCom(UNIDADES_MATERIAL, atual)

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

/** Mensagens da API (sem acento) -> frases para o usuário. A comparação ignora acentos e caixa. */
const MENSAGENS: [RegExp, string][] = [
  [/material nao encontrado/, 'Material não encontrado. Atualize a lista.'],
  [/material ativo nao encontrado/, 'Material não encontrado ou inativo. Atualize a lista.'],
  [/fornecedor preferencial nao encontrado/, 'O fornecedor escolhido não está mais ativo. Escolha outro ou deixe em branco.'],
  [/reserva ativa nao pode ser desativado/, 'Este material tem reserva ativa em projeto e não pode ser desativado agora.'],
]

export function mensagemMaterial(mensagem: string): string {
  const k = chave(mensagem)
  return MENSAGENS.find(([padrao]) => padrao.test(k))?.[1] ?? mensagem
}
