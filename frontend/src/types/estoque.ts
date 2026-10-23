import type { StatusCadastro } from './funcionario'

export type TipoAjusteEstoque = 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA'

/** Indicadores do filtro atual (busca e categoria) de `GET /estoque`. */
export interface IndicadoresEstoque {
  /** Materiais ativos que atendem ao filtro (igual a `meta.total`). */
  materiaisCadastrados: number
  /** Materiais com quantidade reservada maior que zero. */
  comReservaAtiva: number
  /** Materiais sem reserva (`materiaisCadastrados - comReservaAtiva`); não significa saldo livre. */
  semReserva: number
  /** Materiais com saldo físico zero (ou sem registro de estoque). */
  semSaldo: number
  /** Materiais com saldo livre (atual - reservado) maior que zero. */
  disponiveis: number
}

/** Linha da lista; quantidades chegam como texto com 3 casas ("100.000"). */
export interface ItemEstoque {
  id: number
  codigo: string
  nome: string
  categoria: string
  unidadeMedida: string
  quantidadeAtual: string
  quantidadeReservada: string
  quantidadeDisponivel: string
  atualizadoEm: string | null
  projetosComReserva: number
}

export interface RespostaEstoque {
  indicadores: IndicadoresEstoque
  data: ItemEstoque[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface FiltrosEstoque {
  busca?: string
  categoria?: string
  page?: number
  limit?: number
}

export interface SaldoEstoque {
  quantidadeAtual: string
  quantidadeReservada: string
  quantidadeDisponivel: string
  atualizadoEm: string | null
}

export interface ProjetoUtilizandoMaterial {
  reservaId: number
  projetoId: number
  projeto: string
  numeroOrcamento: string
  cliente: string
  quantidade: string
  criadaEm: string
}

/** Valores e data da compra de uma entrada (`despesaMaterial`); null quando a movimentação não veio de uma compra. */
export interface CompraMovimentacaoEstoque {
  valorTotal: string
  valorUnitario: string
  despesa: { data: string } | null
}

export interface MovimentacaoEstoque {
  id: number
  tipo: string
  quantidade: string
  dataHora: string
  justificativa: string | null
  registradoPorUsuario: { id: number; funcionario: { nomeCompleto: string } | null } | null
  /** Só nas compras (`ENTRADA_COMPRA`). */
  despesaMaterial: CompraMovimentacaoEstoque | null
  /** Só nas baixas (`BAIXA_PROJETO`): título do orçamento do projeto, quando houver reserva. */
  projeto?: string | null
}

export interface DetalheEstoque {
  id: number
  codigo: string
  nome: string
  categoria: string
  unidadeMedida: string
  descricao: string | null
  precoReferencia: string
  status: StatusCadastro
  fornecedorPreferencial: { id: number; nomeFantasia: string; razaoSocial: string } | null
  saldo: SaldoEstoque
  projetosUtilizando: ProjetoUtilizandoMaterial[]
  /** Até 5 compras mais recentes. */
  ultimasCompras: MovimentacaoEstoque[]
  /** Até 5 baixas de projeto mais recentes (independentes das compras). */
  ultimasBaixas: MovimentacaoEstoque[]
}

export interface NovoMaterialEstoquePayload {
  nome: string
  categoria: string
  unidadeMedida: string
  quantidadeInicial: number
  /** Positivo, até 2 casas (obrigatório no backend). */
  precoReferencia: number
}

export interface AjusteEstoquePayload {
  tipo: TipoAjusteEstoque
  quantidade: number
  justificativa: string
}
