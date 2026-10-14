import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type {
  Cobranca,
  FormaPagamento,
  Parcela,
  StatusCobranca,
  TipoCobranca,
} from '../types'
import { paraCentavos, semAcento } from './formatadores'

export const ROTULO_TIPO_COBRANCA: Record<TipoCobranca, string> = {
  ENTRADA: 'Entrada',
  FINAL: 'Final',
  MEDICAO: 'Medição',
}

/** Textos do Figma (selects de Projetos e Cobranças); único mapa de rótulos de forma de pagamento. */
export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  TRANSFERENCIA: 'Transferência Bancária',
  CHEQUE: 'Cheque',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
}

export const OPCOES_FORMA_PAGAMENTO: OpcaoCampo[] = (Object.keys(ROTULO_FORMA_PAGAMENTO) as FormaPagamento[]).map(
  (valor) => ({ valor, rotulo: ROTULO_FORMA_PAGAMENTO[valor] }),
)

/** Figma (cartão da cobrança): o que ainda não recebeu nada aparece como "Pendente". */
export const ROTULO_STATUS_COBRANCA: Record<StatusCobranca, string> = {
  EM_ABERTO: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  CANCELADO: 'Cancelada',
}

/** Total já recebido da parcela, em centavos. */
export function recebidoDaParcelaEmCentavos(parcela: Parcela): number {
  return parcela.recebimentos.reduce((total, r) => total + paraCentavos(r.valor), 0)
}

/** Quanto falta receber da parcela, em reais (o detalhe do projeto não traz esse número pronto). */
export function restanteDaParcela(parcela: Parcela): number {
  if (parcela.status === 'PAGA' || parcela.status === 'CANCELADA') return 0
  return Math.max(0, paraCentavos(parcela.valor) - recebidoDaParcelaEmCentavos(parcela)) / 100
}

/** Parcela que ainda aceita recebimento (a API recusa paga e cancelada). */
export function parcelaAbertaParaReceber(parcela: Parcela): boolean {
  return restanteDaParcela(parcela) > 0
}

/** A cobrança aceita novo recebimento: não está paga nem cancelada e ainda tem parcela em aberto. */
export function cobrancaAceitaRecebimento(cobranca: Cobranca): boolean {
  return cobranca.status !== 'PAGO' && cobranca.status !== 'CANCELADO' && cobranca.parcelas.some(parcelaAbertaParaReceber)
}

/**
 * Vencimento exibido no cartão: o da primeira parcela ainda em aberto (ou o da única parcela).
 * Cobrança toda paga mostra o da última parcela.
 */
export function parcelaDeReferencia(cobranca: Cobranca): Parcela | null {
  const ordenadas = [...cobranca.parcelas].sort((a, b) => a.numero - b.numero)
  return ordenadas.find(parcelaAbertaParaReceber) ?? ordenadas[ordenadas.length - 1] ?? null
}

/**
 * Percentual recebido (0 a 100, inteiro) do total da cobrança. Arredonda para baixo: 100% só quando nada falta
 * (R$ 0,01 de restante continua em 99%).
 */
export function percentualRecebido(cobranca: { valorTotal: string | number; valorRecebido: string | number }): number {
  const total = paraCentavos(cobranca.valorTotal)
  if (!(total > 0)) return 0
  const recebido = paraCentavos(cobranca.valorRecebido)
  if (recebido >= total) return 100
  return Math.min(99, Math.max(0, Math.floor((recebido * 100) / total)))
}

/** Nome de quem registrou o recebimento; sem funcionário vinculado, o login. */
export function nomeDeQuemRegistrou(
  registrado: { login: string; funcionario: { nomeCompleto: string } | null } | null | undefined,
): string {
  return registrado?.funcionario?.nomeCompleto ?? registrado?.login ?? ''
}

/** Mensagens conhecidas da API (com ou sem acento; a comparação ignora acentos) ganham texto correto. */
const TRADUCOES: [RegExp, string][] = [
  [/caixa da competencia .* fechado/i, 'O caixa do mês desta data está fechado. Escolha uma data de outro mês.'],
  [/cobranca paga ou cancelada/i, 'Esta cobrança já foi paga ou cancelada.'],
  [/parcela paga ou cancelada/i, 'Esta parcela já foi paga ou cancelada.'],
  [/nao pertence a esta cobranca/i, 'A parcela escolhida não pertence a esta cobrança.'],
  [/cobranca nao encontrada/i, 'Cobrança não encontrada. Atualize a tela.'],
  [/projeto sem cobrancas|nao possui cobrancas/i, 'Este projeto não possui cobranças.'],
]

export function mensagemCobranca(mensagem: string): string {
  const normalizada = semAcento(mensagem)
  const superior = normalizada.match(/valor superior ao restante da parcela: R\$ ([\d.,]+)/i)
  if (superior) return `Valor superior ao restante da parcela (R$ ${superior[1]!.replace('.', ',')}).`
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/** A API gera "Cobranca final N" e "Medicao N" sem acento; exibe a forma correta. */
export function descricaoCobranca(descricao: string): string {
  return descricao.replace(/^Cobranca final\b/, 'Cobrança final').replace(/^Medicao\b/, 'Medição')
}
