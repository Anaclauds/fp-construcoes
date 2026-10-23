export type StatusCaixa = 'ABERTO' | 'FECHADO'
export type TipoMovimentacaoCaixa = 'ENTRADA' | 'SAIDA'

/** Linha do caixa. `categoria` é um código (RECEBIMENTO_CLIENTE, COMPRA_MATERIAL, EXTRA_PROJETO, ESTORNO_DESPESA...). */
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
  /** Texto pronto da categoria (o backend usa o catálogo e rótulos para os códigos do sistema). */
  categoriaRotulo: string
  /** Projeto do recebimento ou do extra que gerou a despesa; `null` nos demais movimentos. */
  projeto: { id: number; titulo: string } | null
  cliente: { id: number; nome: string } | null
  /** Fornecedor da despesa; `null` nos demais movimentos. */
  fornecedor: { id: number; nomeFantasia: string } | null
}

export interface ResumoCaixa {
  valorInicial: string
  totalEntradas: string
  totalSaidas: string
  saldoAtual: string
}

/** Situação do mês, como o backend informa (`situacao`). */
export type SituacaoCaixa = 'NAO_ABERTO' | 'EM_ANDAMENTO' | 'PENDENTE_FECHAMENTO' | 'FECHADO'

export interface Caixa {
  /** `0` quando a competência ainda não foi aberta: nunca fechar nem reabrir. */
  id: number
  /** Dia 1 do mês, em ISO ("2026-09-01T00:00:00.000Z"). */
  competencia: string
  /** Nunca vem `FECHADO` com `naoAberto`; para competência não aberta o backend devolve `ABERTO` com `id: 0`. */
  status: StatusCaixa
  /** `null` quando a competência ainda não foi aberta. */
  abertoEm: string | null
  fechadoEm: string | null
  fechadoPorUsuario: {
    id: number
    login: string
    funcionario: { nomeCompleto: string } | null
  } | null
  /** Só presente (`true`) na competência ainda não aberta. */
  naoAberto?: boolean
  situacao: SituacaoCaixa
  /** Mês encerrado, caixa aberto e meses anteriores já fechados. */
  podeFechar: boolean
  /** Competência (AAAA-MM) do primeiro caixa existente; `null` quando ainda não há nenhum. */
  competenciaMinima: string | null
  resumo: ResumoCaixa
  entradas: MovimentacaoCaixa[]
  saidas: MovimentacaoCaixa[]
}

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
