import type { StatusCadastro } from './funcionario'

export type TipoAjusteEstoque = 'AJUSTE_ENTRADA' | 'AJUSTE_SAIDA'

export interface IndicadoresEstoque {
  materiaisCadastrados: number
  comReservaAtiva: number
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

export interface MovimentacaoEstoque {
  id: number
  tipo: string
  quantidade: string
  dataHora: string
  justificativa: string | null
  registradoPorUsuario?: { id: number; funcionario?: { nomeCompleto: string } | null } | null
  /** Só em backend que detalhe a compra (não existe na versão atual). */
  despesaMaterial?: { valorTotal?: string; valorUnitario?: string; despesa?: { data?: string } | null } | null
  /** Só em backend que detalhe a baixa. */
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
  ultimasCompras: MovimentacaoEstoque[]
  /** Só em backend que devolva as baixas; ausente na versão atual. */
  ultimasBaixas?: MovimentacaoEstoque[]
}

export interface NovoMaterialEstoquePayload {
  nome: string
  categoria: string
  unidadeMedida: string
  quantidadeInicial: number
}

export interface AjusteEstoquePayload {
  tipo: TipoAjusteEstoque
  quantidade: number
  justificativa: string
}
