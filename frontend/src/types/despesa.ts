import type { OpcaoFornecedor } from './fornecedor'

/** Tipo da despesa; não muda depois do cadastro. */
export type TipoDespesa = 'COMPRA_MATERIAL' | 'DIVERSA'

/**
 * Nome da categoria como o backend grava (CAIXA_ALTA_COM_UNDERLINE). Não é mais um conjunto fechado: as categorias
 * vêm do catálogo (`GET /categorias/despesas`) e o usuário pode cadastrar novas.
 */
export type CategoriaDespesa = string

/** Categorias reservadas do sistema: a compra e o extra de projeto as definem sozinhos, não valem para despesa diversa. */
export const CATEGORIA_COMPRA_MATERIAL = 'COMPRA_MATERIAL'
export const CATEGORIA_EXTRA_PROJETO = 'EXTRA_PROJETO'
/** Valor do filtro da lista para despesas legadas sem categoria. */
export const CATEGORIA_SEM_CATEGORIA = 'SEM_CATEGORIA'

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
  /** Status do caixa do mês da despesa. */
  caixa?: { status: 'ABERTO' | 'FECHADO' }
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
  /** Despesa gerada por um extra de projeto (`null` nas demais). */
  extraProjeto: { id: number; projetoId: number } | null
  /** Data do estorno (ISO com hora); `null` enquanto a despesa vale. */
  canceladoEm: string | null
  /**
   * O backend só libera a edição completa quando a despesa não está estornada, não vem de extra e o caixa do mês está
   * aberto. Em despesa de extra (`editavel` falso) a descrição ainda pode ser alterada: ver `podeEditarDespesa`.
   */
  editavel: boolean
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
  /** Nome da categoria, ou `SEM_CATEGORIA` para despesas legadas sem categoria. */
  categoria?: CategoriaDespesa
  fornecedorId?: number
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

/** Corpo do POST. Datas sempre YYYY-MM-DD (a API recusa data com hora). */
export interface DespesaPayload {
  tipo: TipoDespesa
  categoria?: CategoriaDespesa
  data: string
  descricao: string
  valorTotal?: number
  /** Diversa: opcional. Compra: obrigatório. No PATCH, `null` remove o fornecedor de uma despesa diversa. */
  fornecedorId?: number | null
  materiais?: ItemCompraPayload[]
}

/** Corpo do PATCH: só o que mudou; o tipo não pode ser enviado diferente do atual. */
export type DespesaAtualizacao = Partial<Omit<DespesaPayload, 'tipo'>>

/** Opção de fornecedor para a compra (GET /fornecedores/opcoes/ativos). */
export type FornecedorOpcaoDespesa = OpcaoFornecedor

/** Material ativo para a compra (GET /despesas/opcoes/materiais), com os saldos do estoque. */
export interface MaterialOpcaoDespesa {
  id: number
  codigo: string
  nome: string
  /** Unidade do cadastro do material: a compra usa sempre esta. */
  unidadeMedida: string
  precoReferencia: string
  quantidadeAtual: number
  quantidadeReservada: number
  saldoDisponivel: number
}

/** Corpo do PATCH /despesas/:id/cancelar (estorno). */
export interface EstornoDespesaPayload {
  /** 3 a 500 caracteres. */
  motivo: string
}
