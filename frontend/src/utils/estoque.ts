import { mascararDecimal } from './decimal'
import { normalizarTexto } from './formatadores'
import { rotuloUnidade, simboloUnidade } from './materiais'
import type { ProjetoUtilizandoMaterial } from '../types/estoque'

/** Limites (a API não tem @Max: estes seguem as colunas DECIMAL(12,3)). */
export const QUANTIDADE_MAXIMA = 999_999_999.999
export const LIMITE_JUSTIFICATIVA = 1000

/** Quantidade da API (texto com 3 casas) -> "5.000" / "12,5" / "0" (sem zeros à direita). */
export function formatarQuantidade(valor: string | number): string {
  const n = Number(valor)
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
}

/** "100 m", "1.200 un". */
export function quantidadeComUnidade(valor: string | number, unidade: string): string {
  const texto = formatarQuantidade(valor)
  const simbolo = simboloUnidade(unidade)
  return simbolo ? `${texto} ${simbolo}` : texto
}

/** "Metro (m)": nome da unidade com o símbolo entre parênteses (quando o nome já traz ou é o próprio símbolo, fica só o nome). */
export function unidadeComSimbolo(unidade: string): string {
  const nome = rotuloUnidade(unidade)
  const simbolo = simboloUnidade(unidade)
  return nome.includes('(') || !simbolo || simbolo.toLowerCase() === nome.toLowerCase() ? nome : `${nome} (${simbolo})`
}

/** Porcentagem disponível do estoque atual (0 a 100, inteiro); sem estoque -> 0. */
export function percentualDisponivel(atual: string | number, disponivel: string | number): number {
  const a = Number(atual)
  const d = Number(disponivel)
  if (!(a > 0) || !Number.isFinite(d)) return 0
  return Math.max(0, Math.min(100, Math.round((d / a) * 100)))
}

/** Máscara de quantidade: mesma regra de orçamentos e projetos (9 inteiros, 3 decimais; "1.000" é mil). */
export const mascararQuantidade = (valor: string): string => mascararDecimal(valor, 3, 9)

/** "12,5" -> 12.5; vazio ou inválido -> null. */
export function quantidadeParaNumero(texto: string): number | null {
  const t = texto.trim()
  if (t === '' || !/^\d+(,\d{0,3})?$/.test(t)) return null
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Número -> texto do campo ("12.5" -> "12,5"). */
export function quantidadeParaTexto(valor: string | number): string {
  return String(Number(valor)).replace('.', ',')
}

export interface ProjetoAgrupado {
  projetoId: number
  titulo: string
  cliente: string
  quantidade: number
}

/** A API devolve uma linha por reserva; aqui vira uma linha por projeto com o total reservado. */
export function agruparProjetos(reservas: ProjetoUtilizandoMaterial[]): ProjetoAgrupado[] {
  const mapa = new Map<number, ProjetoAgrupado>()
  for (const r of reservas) {
    const existente = mapa.get(r.projetoId)
    if (existente) existente.quantidade += Number(r.quantidade)
    else mapa.set(r.projetoId, { projetoId: r.projetoId, titulo: r.projeto, cliente: r.cliente, quantidade: Number(r.quantidade) })
  }
  return [...mapa.values()]
}

const MENSAGENS: [RegExp, string][] = [
  [/material nao encontrado/, 'Material não encontrado. Atualize a lista.'],
  [/material ativo nao encontrado/, 'Material não encontrado ou inativo. Atualize a lista.'],
  [/o saldo disponivel foi alterado/, 'O saldo disponível mudou enquanto você preenchia. Confira os valores e tente de novo.'],
]

/** Mensagem da API (sem acento) -> frase para o usuário; "Quantidade maxima para saida: 65.000" ganha unidade. */
export function mensagemEstoque(mensagem: string, unidade?: string): string {
  const k = normalizarTexto(mensagem)
  const maxima = /quantidade maxima para saida:\s*([\d.,]+)/.exec(k)
  if (maxima) {
    const valor = unidade ? quantidadeComUnidade(maxima[1]!, unidade) : formatarQuantidade(maxima[1]!)
    return `Quantidade acima do saldo disponível. Máximo para saída: ${valor}.`
  }
  return MENSAGENS.find(([padrao]) => padrao.test(k))?.[1] ?? mensagem
}
