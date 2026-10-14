import type { Cliente } from './cliente'
import type { Paginado } from './paginado'
import type { ModalidadePagamento, TipoOrcamento } from './orcamento'

export type TipoCobranca = 'ENTRADA' | 'FINAL' | 'MEDICAO'

/** Status da cobrança em si (a API ainda pode devolver CANCELADO). */
export type StatusCobranca = 'EM_ABERTO' | 'PARCIAL' | 'PAGO' | 'CANCELADO'

/** Status calculado do projeto na lista de cobranças. */
export type StatusProjetoCobranca = 'EM_ABERTO' | 'PARCIAL' | 'PAGO'

export type StatusParcela = 'EM_ABERTO' | 'PARCIAL' | 'PAGA' | 'VENCIDA' | 'CANCELADA'

export type FormaPagamento =
  | 'PIX'
  | 'DINHEIRO'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'BOLETO'

export interface IndicadoresCobrancas {
  totalAReceber: number
  totalEmAberto: number
  totalRecebido: number
  totalProjetos: number
}

/** Linha da lista: um projeto com todas as suas cobranças somadas. Valores já chegam como número. */
export interface ProjetoCobrancas {
  projetoId: number
  /** "0001" (sem o #). */
  numero: string
  titulo: string
  cliente: Cliente
  tipo: TipoOrcamento
  quantidadeCobrancas: number
  valorTotal: number
  valorRecebido: number
  valorRestante: number
  status: StatusProjetoCobranca
}

export interface ListaCobrancas extends Paginado<ProjetoCobrancas> {
  indicadores: IndicadoresCobrancas
}

/** `GET /cobrancas/relatorios`: mesmos filtros da lista, sem paginação (todos os projetos de uma vez). */
export interface RelatorioCobrancas {
  indicadores: IndicadoresCobrancas
  data: ProjetoCobrancas[]
}

export interface FiltrosCobrancas {
  busca?: string
  tipo?: TipoOrcamento
  status?: StatusProjetoCobranca
  page?: number
  limit?: number
}

export interface Recebimento {
  id: number
  /** Decimal do Prisma: string. */
  valor: string
  dataRecebimento: string
  formaPagamento: FormaPagamento
  observacoes: string | null
  /** Só vem em `GET /cobrancas/:id`. */
  registradoPorUsuario?: { login: string; funcionario: { nomeCompleto: string } | null } | null
}

export interface Parcela {
  id: number
  numero: number
  vencimento: string
  /** Decimal do Prisma: string. */
  valor: string
  status: StatusParcela
  recebimentos: Recebimento[]
  /** Só vêm em `GET /cobrancas/:id`; no detalhe do projeto são calculados a partir dos recebimentos. */
  valorRecebido?: number
  valorRestante?: number
  /** Em aberto/parcial com vencimento anterior a hoje. Só vem no backend atualizado; ausente = não mostrar. */
  vencida?: boolean
}

export interface Cobranca {
  id: number
  tipo: TipoCobranca
  modalidade: ModalidadePagamento
  formaPagamento: FormaPagamento | null
  /** Decimal do Prisma: string. */
  valorTotal: string
  status: StatusCobranca
  criadaEm: string
  descricao: string
  parcelas: Parcela[]
  valorRecebido: number
  valorRestante: number
}

/** `GET /cobrancas/projetos/:id`: resumo do projeto mais as cobranças com parcelas. */
export interface ProjetoCobrancasDetalhe extends ProjetoCobrancas {
  cobrancas: Cobranca[]
}

export interface RecebimentoPayload {
  parcelaId: number
  valor: number
  /** YYYY-MM-DD. */
  dataRecebimento: string
  formaPagamento: FormaPagamento
  observacoes?: string
}

export type FormatoRelatorioCobrancas = 'pdf' | 'excel'
