import type { Caixa, SituacaoCaixa } from '../types/caixa'
import { hojeIso } from './datas'
import { semAcento } from './formatadores'

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const

/**
 * Primeiro mês navegável. Consultar um mês CRIA o caixa dele no banco, então a navegação não vai a anos
 * arbitrários (a tela só consulta meses do intervalo [MES_MINIMO, mês atual]).
 */
export const MES_MINIMO = '2020-01'

const PADRAO_COMPETENCIA = /^(\d{4})-(0[1-9]|1[0-2])$/

export function competenciaValida(valor: unknown): valor is string {
  return typeof valor === 'string' && PADRAO_COMPETENCIA.test(valor)
}

/**
 * Mês atual (AAAA-MM) no fuso do negócio, o mesmo "hoje" do backend. Lido na hora da chamada: uma tela que fica aberta
 * pela virada do mês só enxerga o mês novo na próxima navegação ou consulta (aceito; o caixa recarrega ao trocar de mês).
 */
export function competenciaAtual(): string {
  return hojeIso().slice(0, 7)
}

/** Competência (dia 1 em ISO, ex.: "2026-09-01T00:00:00.000Z") -> "2026-09". */
export function competenciaDoCaixa(caixa: Pick<Caixa, 'competencia'>): string {
  return caixa.competencia.slice(0, 7)
}

/** Soma (ou subtrai) meses de uma competência AAAA-MM. */
export function deslocarCompetencia(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split('-').map(Number) as [number, number]
  const indice = ano * 12 + (mes - 1) + meses
  const novoAno = Math.floor(indice / 12)
  return `${String(novoAno).padStart(4, '0')}-${String(indice - novoAno * 12 + 1).padStart(2, '0')}`
}

/** "2026-09" -> "Setembro". */
export function nomeDoMes(competencia: string): string {
  return MESES[Number(competencia.slice(5, 7)) - 1] ?? competencia
}

/** "2026-09" -> "Setembro 2026" (Figma). */
export function rotuloCompetencia(competencia: string): string {
  return `${nomeDoMes(competencia)} ${competencia.slice(0, 4)}`
}

/** Mantém a competência dentro do intervalo navegável (entre `MES_MINIMO` e o mês atual). */
export function limitarCompetencia(competencia: string): string {
  const atual = competenciaAtual()
  if (competencia > atual) return atual
  if (competencia < MES_MINIMO) return MES_MINIMO
  return competencia
}

/**
 * Situação mostrada na tela (Figma): caixa fechado; aberto do mês corrente ("Mês em andamento"); ou aberto de um
 * mês que já terminou ("Pendente de fechamento").
 */
export function situacaoDoCaixa(caixa: Pick<Caixa, 'status' | 'competencia'>): SituacaoCaixa {
  if (caixa.status === 'FECHADO') return 'FECHADO'
  return competenciaDoCaixa(caixa) < competenciaAtual() ? 'PENDENTE' : 'EM_ANDAMENTO'
}

export const ROTULO_SITUACAO_CAIXA: Record<SituacaoCaixa, string> = {
  EM_ANDAMENTO: 'Mês em andamento',
  PENDENTE: 'Pendente de fechamento',
  FECHADO: 'Mês fechado',
}

/** Rótulos das categorias das movimentações (códigos da API). Entradas de projeto aparecem como "Cobrança" (Figma). */
const ROTULO_CATEGORIA_CAIXA: Record<string, string> = {
  RECEBIMENTO_CLIENTE: 'Cobrança',
  COMPRA_MATERIAL: 'Material',
  COMBUSTIVEL: 'Combustível',
  FERRAMENTA: 'Ferramenta',
  MANUTENCAO: 'Manutenção',
  ALIMENTACAO: 'Alimentação',
  MAO_DE_OBRA: 'Mão de Obra',
  ALUGUEL: 'Aluguel',
  OUTROS: 'Outros',
  EXTRA_PROJETO: 'Extra de projeto',
  SEM_CATEGORIA: 'Sem categoria',
}

export function rotuloCategoriaCaixa(categoria: string): string {
  if (ROTULO_CATEGORIA_CAIXA[categoria]) return ROTULO_CATEGORIA_CAIXA[categoria]
  // Código desconhecido: "NOVA_CATEGORIA" -> "Nova categoria".
  const texto = categoria.toLowerCase().replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const TRADUCOES: [RegExp, string][] = [
  [/usuario sem permissao/i, 'Você não tem permissão para esta operação.'],
  [/caixa ja esta fechado|caixa ja foi fechado|ja foi fechado/i, 'Este caixa já está fechado. Atualize a tela.'],
  [/caixa nao encontrado/i, 'Caixa não encontrado. Atualize a tela.'],
  [/caixa ja esta aberto/i, 'Este caixa já está aberto. Atualize a tela.'],
]

export function mensagemCaixa(mensagem: string): string {
  const normalizada = semAcento(mensagem)
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/** O caixa já mudou de situação em outra tela ("já está fechado/aberto"): a tela precisa recarregar o caixa. */
export function mensagemDeCaixaDesatualizado(mensagem: string): boolean {
  return /caixa ja esta (fechado|aberto)|ja foi fechado/i.test(semAcento(mensagem))
}
