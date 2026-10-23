import { filtrarDecimal, normalizarDecimal, textoParaEscala } from './decimal'
import { normalizarTexto } from './formatadores'
import { rotuloUnidade, simboloUnidade } from './materiais'
import type { ErroApi } from '../services/api'
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

/** Unidades contáveis do backend (`quantidade.util.ts`): exigem quantidade inteira; as demais aceitam até 3 casas. */
const UNIDADES_INTEIRAS = ['un', 'unidade', 'unidades', 'pc', 'pcs', 'peca', 'pecas', 'barra', 'caixa', 'rolo']

/** Conveniência de tela; quem decide é o servidor (`QUANTIDADE_INTEIRA_OBRIGATORIA`). */
export function unidadeExigeInteiro(unidade: string): boolean {
  return UNIDADES_INTEIRAS.includes(normalizarTexto(unidade))
}

/** Filtro por tecla da quantidade: mesma regra de orçamentos e projetos (9 inteiros, 3 decimais; ver utils/decimal.ts). */
export const mascararQuantidade = (valor: string): string => filtrarDecimal(valor, 3, 9)

/** Forma final da quantidade ao sair do campo ("1.000" -> "1000", "12.5" -> "12,5"). */
export const normalizarQuantidade = (valor: string): string => normalizarDecimal(valor, 3, 9)

/** "12,5" -> 12.5; "1.000" -> 1000 (milhar); vazio ou inválido -> null. */
export function quantidadeParaNumero(texto: string): number | null {
  const escala = textoParaEscala(texto, 3)
  return escala === null ? null : escala / 1000
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

/** Mensagem do erro da API usando `codigo` e `detalhes` (sem extrair números do texto). */
export function mensagemErroEstoque(erro: ErroApi, unidade?: string): string {
  const { codigo, detalhes } = erro
  const comUnidade = (valor: number) => (unidade ? quantidadeComUnidade(valor, unidade) : formatarQuantidade(valor))
  if (codigo === 'ESTOQUE_SAIDA_ACIMA_DO_DISPONIVEL' && typeof detalhes.maximo === 'number') {
    return `Quantidade acima do saldo disponível. Máximo para saída: ${comUnidade(detalhes.maximo)}.`
  }
  if (codigo === 'ESTOQUE_LIMITE_EXCEDIDO' && typeof detalhes.maximoEntrada === 'number') {
    return `A entrada passaria do limite do estoque. Máximo para entrada: ${comUnidade(detalhes.maximoEntrada)}.`
  }
  if (codigo === 'QUANTIDADE_INTEIRA_OBRIGATORIA') return 'Esta unidade exige quantidade inteira.'
  if (codigo === 'ESTOQUE_SALDO_ALTERADO') return MENSAGENS[2]![1]
  if (codigo === 'MATERIAL_INATIVO') return MENSAGENS[1]![1]
  return mensagemEstoque(erro.mensagem, unidade)
}
