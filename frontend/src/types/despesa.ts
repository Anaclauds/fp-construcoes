import type { OpcaoFornecedor } from './fornecedor'

/** Tipo da despesa; não muda depois do cadastro. */
export type TipoDespesa = 'COMPRA_MATERIAL' | 'DIVERSA'

export type CategoriaDespesa =
  | 'COMPRA_MATERIAL'
  | 'COMBUSTIVEL'
  | 'FERRAMENTA'
  | 'MANUTENCAO'
  | 'ALIMENTACAO'
  | 'MAO_DE_OBRA'
  | 'ALUGUEL'
  | 'OUTROS'

/** Usuário que registrou, como a API devolve. */
export interface RegistradoPorDespesa {
  id: number
  login: string
  funcionario: { nomeCompleto: string } | null
}

export interface FornecedorDaDespesa {
  id: number
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
}

/** Item de uma compra de material; decimais chegam como texto ("12.5"). */
export interface ItemDespesaMaterial {
  id: number
  despesaId: number
  materialId: number
  quantidade: string
  unidadeMedida: string
  valorUnitario: string
  valorTotal: string
  material: { id: number; codigo: string; nome: string; unidadeMedida: string }
}

export interface MovimentacaoDaDespesa {
  id: number
  caixaId: number
  tipo: 'ENTRADA' | 'SAIDA'
  data: string
  descricao: string
  categoria: string
  valor: string
}

/** Despesa como a API devolve. `data` vem como ISO com hora zerada (usar só a parte da data). */
export interface Despesa {
  id: number
  tipo: TipoDespesa
  categoria: CategoriaDespesa | null
  data: string
  fornecedorId: number | null
  descricao: string
  valorTotal: string
  registradoPorUsuarioId: number
  fornecedor: FornecedorDaDespesa | null
  registradoPorUsuario: RegistradoPorDespesa | null
  materiais: ItemDespesaMaterial[]
  movimentacaoCaixa: MovimentacaoDaDespesa | null
  /** Só no backend atualizado: despesa gerada por um extra de projeto. */
  extraProjeto?: { id: number; projetoId: number } | null
}

export interface IndicadoresDespesas {
  totalDespesas: string
  totalComprasMateriais: string
  totalOutrasDespesas: string
}

export interface RespostaDespesas {
  indicadores: IndicadoresDespesas
  data: Despesa[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface FiltrosDespesas {
  busca?: string
  tipo?: TipoDespesa
  categoria?: CategoriaDespesa
  /** YYYY-MM-DD */
  dataInicio?: string
  dataFim?: string
  page?: number
  limit?: number
}

export interface ItemCompraPayload {
  materialId: number
  quantidade: number
  unidadeMedida: string
  valorUnitario: number
}

/** Corpo do POST. Datas sempre YYYY-MM-DD (com hora a API devolve 500). */
export interface DespesaPayload {
  tipo: TipoDespesa
  categoria?: CategoriaDespesa
  data: string
  descricao: string
  valorTotal?: number
  fornecedorId?: number
  materiais?: ItemCompraPayload[]
}

/** Corpo do PATCH: só o que mudou; o tipo não pode ser enviado diferente do atual. */
export type DespesaAtualizacao = Partial<Omit<DespesaPayload, 'tipo'>>

/** Opção de fornecedor para a compra (GET /fornecedores/opcoes/ativos). */
export type FornecedorOpcaoDespesa = OpcaoFornecedor

/** Material ativo para a compra (GET /materiais), só com o que a tela usa. */
export interface MaterialOpcaoDespesa {
  id: number
  codigo: string
  nome: string
  unidadeMedida: string
  precoReferencia: string
}
