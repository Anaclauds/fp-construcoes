import type { Caixa, CaixaHistorico, MovimentacaoCaixa, SituacaoCaixa } from '../types/caixa'
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
 * Primeira competência que a API aceita (consultar não cria mais o caixa, então não há risco em navegar). A navegação
 * pelas setas usa `competenciaMinima` (o primeiro caixa existente); este valor só limita a URL.
 */
export const MES_MINIMO = '2000-01'

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

/** A competência ainda não foi aberta (`id: 0`): a tela oferece "Abrir caixa" e nunca fecha ou reabre este registro. */
export function caixaNaoAberto(caixa: Pick<Caixa, 'id' | 'naoAberto'>): boolean {
  return caixa.naoAberto === true || caixa.id === 0
}

/**
 * Havendo caixa de mês anterior, o servidor abre o novo com o saldo final do anterior e ignora o valor digitado.
 * `competenciaMinima` é o primeiro caixa existente: se for anterior à competência, há um caixa antes dela.
 */
export function herdaSaldoAnterior(caixa: Pick<Caixa, 'competencia' | 'competenciaMinima'>): boolean {
  return caixa.competenciaMinima !== null && caixa.competenciaMinima < competenciaDoCaixa(caixa)
}

/** Por que uma competência não aberta pode (ou não) ser aberta agora. */
export type SituacaoAbertura = 'liberada' | 'antes-do-primeiro' | 'no-intervalo'

/**
 * A abertura só vale depois do último caixa existente (ou como primeiro caixa, se não houver nenhum): abrir um mês
 * entre dois caixas quebraria a continuidade dos saldos. `ultima` indefinido = ainda não consultada; nesse caso só
 * se barra o mês anterior ao primeiro caixa e o servidor decide o resto.
 */
export function situacaoAbertura(
  competencia: string,
  primeira: string | null,
  ultima: string | null | undefined,
): SituacaoAbertura {
  if (ultima === null || primeira === null) return 'liberada'
  if (competencia < primeira) return 'antes-do-primeiro'
  if (ultima === undefined || competencia > ultima) return 'liberada'
  return 'no-intervalo'
}

export const ROTULO_SITUACAO_CAIXA: Record<SituacaoCaixa, string> = {
  NAO_ABERTO: 'Caixa não aberto',
  EM_ANDAMENTO: 'Mês em andamento',
  PENDENTE_FECHAMENTO: 'Pendente de fechamento',
  FECHADO: 'Mês fechado',
}

/** Rótulos do Figma para os dois códigos mais comuns; as demais categorias usam o texto que o backend envia. */
const ROTULO_FIGMA: Record<string, string> = {
  RECEBIMENTO_CLIENTE: 'Cobrança',
  COMPRA_MATERIAL: 'Material',
}

/** Texto da categoria da movimentação (Figma para recebimento e compra; senão `categoriaRotulo` do backend). */
export function rotuloCategoriaCaixa(movimentacao: Pick<MovimentacaoCaixa, 'categoria' | 'categoriaRotulo'>): string {
  const figma = ROTULO_FIGMA[movimentacao.categoria]
  if (figma) return figma
  if (movimentacao.categoriaRotulo) return movimentacao.categoriaRotulo
  // Backend sem rótulo: "NOVA_CATEGORIA" -> "Nova categoria".
  const texto = movimentacao.categoria.toLowerCase().replace(/_/g, ' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Quem está por trás do lançamento, para a segunda linha da tabela: "Projeto X · Cliente Y" ou o fornecedor. */
export function contextoMovimentacao(movimentacao: Pick<MovimentacaoCaixa, 'projeto' | 'cliente' | 'fornecedor'>): string {
  const partes: string[] = []
  if (movimentacao.projeto) partes.push(movimentacao.projeto.titulo)
  if (movimentacao.cliente) partes.push(movimentacao.cliente.nome)
  if (movimentacao.fornecedor) partes.push(movimentacao.fornecedor.nomeFantasia)
  return partes.join(' · ')
}

/** Mensagens por `codigo` legível do backend (estável); o texto da API só entra quando não há código conhecido. */
const MENSAGEM_POR_CODIGO_CAIXA: Record<string, string> = {
  CAIXA_JA_FECHADO: 'Este caixa já está fechado. Atualize a tela.',
  CAIXA_JA_ABERTO: 'Este caixa já está aberto. Atualize a tela.',
}

/**
 * Códigos que indicam caixa já alterado em outra tela. `CAIXA_FECHADO` fica de fora: no fechamento significa
 * "só pode ser fechado depois do fim do mês" e, nos lançamentos, "caixa do mês fechado".
 */
const CODIGOS_CAIXA_DESATUALIZADO = new Set(['CAIXA_JA_FECHADO', 'CAIXA_JA_ABERTO'])

/**
 * "O saldo inicial não pode ser alterado depois de movimentações" (abrir caixa que já tem lançamentos). O backend só
 * tem o código gerado, que muda se o método for renomeado: por isso é último recurso, com o texto como reserva.
 */
const CODIGO_SALDO_INICIAL_BLOQUEADO = 'FINANCEIRO_ABRIRCAIXA_CONFLICT_02'

/*
 * Os demais erros do caixa ainda não têm código legível no backend (só os gerados, como
 * FINANCEIRO_ABRIRCAIXA_CONFLICT_02, que mudam se o método for renomeado): último recurso, pelo texto, sem acento.
 */
const TRADUCOES: [RegExp, string][] = [
  [/usuario sem permissao/i, 'Você não tem permissão para esta operação.'],
  [/caixa nao encontrado/i, 'Caixa não encontrado. Atualize a tela.'],
  [/mes futuro/i, 'Não é possível abrir o caixa de um mês futuro.'],
  [/feche o caixa anterior antes de abrir/i, 'Feche o caixa do mês anterior antes de abrir este.'],
  [
    /saldo inicial nao pode ser alterado depois de movimentacoes/i,
    'O valor inicial não pode mais ser alterado: este caixa já tem lançamentos.',
  ],
  [/so pode ser fechado depois do fim do mes/i, 'O caixa só pode ser fechado depois do fim do mês.'],
  [/feche os meses anteriores primeiro/i, 'Feche os meses anteriores primeiro, em ordem.'],
  [
    /reabra primeiro os caixas posteriores/i,
    'Reabra primeiro os caixas dos meses seguintes. Os saldos de um mês dependem do anterior.',
  ],
]

export function mensagemCaixa(mensagem: string, codigo = ''): string {
  const porCodigo = MENSAGEM_POR_CODIGO_CAIXA[codigo]
  if (porCodigo) return porCodigo
  const normalizada = semAcento(mensagem)
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/**
 * O caixa já mudou em outra tela (já fechado/aberto, ou já com lançamentos): a tela precisa recarregar o caixa.
 * Fechado/aberto vêm por `codigo`; "saldo inicial não pode ser alterado" só tem código gerado (ver acima).
 */
export function mensagemDeCaixaDesatualizado(mensagem: string, codigo = ''): boolean {
  return (
    CODIGOS_CAIXA_DESATUALIZADO.has(codigo) ||
    codigo === CODIGO_SALDO_INICIAL_BLOQUEADO ||
    /saldo inicial nao pode ser alterado/i.test(semAcento(mensagem))
  )
}

/**
 * Situação de uma linha do histórico, que não traz `situacao`: fechado é fechado; aberto de mês anterior ao atual
 * aguarda fechamento; aberto do mês atual está em andamento (mesma regra do caixa do mês).
 */
export function situacaoDoCaixaHistorico(caixa: Pick<CaixaHistorico, 'status' | 'competencia'>): SituacaoCaixa {
  if (caixa.status === 'FECHADO') return 'FECHADO'
  return competenciaDoCaixa(caixa) < competenciaAtual() ? 'PENDENTE_FECHAMENTO' : 'EM_ANDAMENTO'
}
