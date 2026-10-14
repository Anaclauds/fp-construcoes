export type StatusCaixa = 'ABERTO' | 'FECHADO'
export type TipoMovimentacaoCaixa = 'ENTRADA' | 'SAIDA'

/** Linha do caixa. `categoria` é um código (RECEBIMENTO_CLIENTE, COMPRA_MATERIAL, EXTRA_PROJETO, SEM_CATEGORIA...). */
export interface MovimentacaoCaixa {
  id: number
  caixaId: number
  tipo: TipoMovimentacaoCaixa
  data: string
  descricao: string
  categoria: string
  valor: string
  recebimentoId: number | null
  despesaId: number | null
}

export interface ResumoCaixa {
  valorInicial: string
  totalEntradas: string
  totalSaidas: string
  saldoAtual: string
}

export interface Caixa {
  id: number
  /** Dia 1 do mês, em ISO ("2026-09-01T00:00:00.000Z"). */
  competencia: string
  status: StatusCaixa
  abertoEm: string
  fechadoEm: string | null
  fechadoPorUsuario: {
    id: number
    login: string
    funcionario: { nomeCompleto: string } | null
  } | null
  resumo: ResumoCaixa
  entradas: MovimentacaoCaixa[]
  saidas: MovimentacaoCaixa[]
}

/** Situação mostrada na tela, derivada do status e da competência. */
export type SituacaoCaixa = 'EM_ANDAMENTO' | 'PENDENTE' | 'FECHADO'

export interface FiltrosRecebimentos {
  dataInicio?: string
  dataFim?: string
  page?: number
  limit?: number
}

export interface RecebimentoRelatorio {
  id: number
  dataRecebimento: string
  valor: string
  formaPagamento: string
  observacoes: string | null
  parcela: { id: number; numero: number; vencimento: string }
  cobrancaId: number
  projeto: { id: number; numero: string; titulo: string }
  cliente: { id: number; nome: string }
}

export interface RelatorioRecebimentos {
  indicadores: { totalRecebido: string; quantidadeRecebimentos: number; ticketMedio: string }
  resumoPorFormaPagamento: { formaPagamento: string; quantidade: number; valor: string }[]
  data: RecebimentoRelatorio[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}
