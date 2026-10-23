import { filtrarDecimal, normalizarDecimal, textoParaEscala } from './decimal'
import { normalizarTexto } from './formatadores'
import { rotuloUnidade, simboloUnidade } from './materiais'
import type { ErroApi } from '../services/api'
import type { ProjetoUtilizandoMaterial } from '../types/estoque'

/** Limites do DTO de estoque no backend (quantidade até 999.999.999,999 com 3 casas; justificativa até 1000 caracteres). */
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

export interface ProjetoAgrupado {
  projetoId: number
  titulo: string
  cliente: string
  quantidade: number
}

/** Quantidade da API em milésimos inteiros (a coluna tem 3 casas), para somar sem erro de ponto flutuante. */
const emMilesimos = (quantidade: string): number => Math.round(Number(quantidade) * 1000)

/** A API devolve uma linha por reserva; aqui vira uma linha por projeto com o total reservado (somado em milésimos). */
export function agruparProjetos(reservas: ProjetoUtilizandoMaterial[]): ProjetoAgrupado[] {
  const mapa = new Map<number, { projeto: ProjetoAgrupado; milesimos: number }>()
  for (const r of reservas) {
    const existente = mapa.get(r.projetoId)
    if (existente) existente.milesimos += emMilesimos(r.quantidade)
    else mapa.set(r.projetoId, { projeto: { projetoId: r.projetoId, titulo: r.projeto, cliente: r.cliente, quantidade: 0 }, milesimos: emMilesimos(r.quantidade) })
  }
  return [...mapa.values()].map(({ projeto, milesimos }) => ({ ...projeto, quantidade: milesimos / 1000 }))
}

/**
 * Mensagem do erro da API decidida pelo `codigo` e por `detalhes` (sem extrair números nem frases do texto, que vem sem acento).
 * Os terminados em `_01` são gerados pelo nome do método no backend (`estoque.service.ts`, `materiais.service.ts`); não há
 * código legível para eles, então ficam só aqui e precisam acompanhar o backend.
 */
export function mensagemErroEstoque(erro: ErroApi, unidade?: string): string {
  const { codigo, detalhes } = erro
  const comUnidade = (valor: number) => (unidade ? quantidadeComUnidade(valor, unidade) : formatarQuantidade(valor))
  switch (codigo) {
    case 'ESTOQUE_SAIDA_ACIMA_DO_DISPONIVEL':
      return typeof detalhes.maximo === 'number'
        ? `Quantidade acima do saldo disponível. Máximo para saída: ${comUnidade(detalhes.maximo)}.`
        : 'Quantidade acima do saldo disponível.'
    case 'ESTOQUE_LIMITE_EXCEDIDO':
      return typeof detalhes.maximoEntrada === 'number'
        ? `A entrada passaria do limite do estoque. Máximo para entrada: ${comUnidade(detalhes.maximoEntrada)}.`
        : 'A entrada passaria do limite do estoque.'
    case 'QUANTIDADE_INTEIRA_OBRIGATORIA':
      return 'Esta unidade exige quantidade inteira.'
    case 'ESTOQUE_SALDO_ALTERADO':
      return 'O saldo disponível mudou enquanto você preenchia. Confira os valores e tente de novo.'
    case 'MATERIAL_INATIVO':
      return 'Material não encontrado ou inativo. Atualize a lista.'
    case 'ESTOQUE_FINDONE_NOTFOUND_01':
    case 'MATERIAIS_FINDONE_NOTFOUND_01':
      return 'Material não encontrado. Atualize a lista.'
    case 'MATERIAIS_VALIDARNOME_CONFLICT_01':
      return 'Já existe um material ativo com este nome.'
    case 'ESTOQUE_AJUSTAR_BADREQUEST_01':
      return 'Informe a justificativa do ajuste.'
    default:
      return erro.mensagem
  }
}
