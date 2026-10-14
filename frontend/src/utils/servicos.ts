import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { mascararMoeda } from './formatadores'
import { rotuloUnidade } from './orcamentos'

/** Limites do cadastro. A descrição não tem limite no backend (coluna TEXT): o do front evita textos absurdos. */
export const LIMITE_NOME_SERVICO = 150
export const LIMITE_DESCRICAO_SERVICO = 1000
export const LIMITE_UNIDADE_SERVICO = 50
/** DECIMAL(12,2): maior valor aceito pela API. */
export const VALOR_MAXIMO_SERVICO = 9_999_999_999.99

/** A unidade é texto livre na API; o front oferece estas opções (o valor salvo é o próprio rótulo). */
export const UNIDADES_SERVICO: OpcaoCampo[] = [
  'Unidade',
  'Metro Linear',
  'Metro Quadrado (m²)',
  'Metro Cúbico (m³)',
  'Quilograma (kg)',
  'Hora',
  'Diária',
  'Empreitada',
].map((rotulo) => ({ valor: rotulo, rotulo }))

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

/** Grafias já cadastradas (siglas e variações) que equivalem a uma das opções da lista. */
const EQUIVALENTES: Record<string, string> = {
  un: 'Unidade',
  unid: 'Unidade',
  unidade: 'Unidade',
  ml: 'Metro Linear',
  'metro linear': 'Metro Linear',
  m2: 'Metro Quadrado (m²)',
  'm²': 'Metro Quadrado (m²)',
  'metro quadrado': 'Metro Quadrado (m²)',
  m3: 'Metro Cúbico (m³)',
  'm³': 'Metro Cúbico (m³)',
  'metro cubico': 'Metro Cúbico (m³)',
  kg: 'Quilograma (kg)',
  quilo: 'Quilograma (kg)',
  quilograma: 'Quilograma (kg)',
  hora: 'Hora',
  h: 'Hora',
  diaria: 'Diária',
  empreitada: 'Empreitada',
}

/** Valor salvo -> opção equivalente da lista; se não houver equivalente devolve o texto como está. */
export function unidadeParaOpcao(valor: string): string {
  const chave = semAcento(valor)
  const exata = UNIDADES_SERVICO.find((o) => semAcento(o.valor) === chave)
  return exata?.valor ?? EQUIVALENTES[chave] ?? valor.trim()
}

/** Lista de unidades do formulário + o valor legado (ex.: "SERVICO"), para o cadastro antigo não se perder. */
export function opcoesUnidade(atual?: string): OpcaoCampo[] {
  if (!atual || UNIDADES_SERVICO.some((o) => o.valor === atual)) return UNIDADES_SERVICO
  return [...UNIDADES_SERVICO, { valor: atual, rotulo: rotuloUnidade(atual) }]
}

/** Digitação em centavos até 12 dígitos ("35000" -> "R$ 350,00"), como o DECIMAL(12,2) da API. */
export const mascararValorServico = (valor: string) => mascararMoeda(valor, 12)


/** A API responde sem acentos; estas mensagens ganham texto correto. */
export function mensagemServico(mensagem: string): string {
  if (/servico nao encontrado/i.test(mensagem)) return 'Serviço não encontrado. Atualize a lista.'
  return mensagem
}
