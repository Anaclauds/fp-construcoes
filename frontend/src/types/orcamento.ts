import type { Paginado } from './paginado'

export type TipoOrcamento = 'CONSTRUCAO_CIVIL' | 'SERRALHERIA' | 'CALHAS'

export type StatusOrcamento = 'PENDENTE' | 'EM_ANALISE' | 'APROVADO' | 'REPROVADO' | 'CANCELADO'

export type ModalidadePagamento = 'A_VISTA' | 'PARCELADO_MANUAL' | 'PARCELADO_AUTOMATICO'

/** Cliente resumido que a API devolve dentro do orçamento. */
export interface ClienteDoOrcamento {
  id: number
  nome: string
  telefone: string
  cidade: string
  estado: string
  status: 'ATIVO' | 'INATIVO'
}

/** Decimais do Prisma chegam como string ("30", "12.5"). Datas vêm em ISO: use só `slice(0, 10)`. */
export interface ItemMaterialOrcamento {
  id: number
  materialId: number
  quantidade: string
  valorUnitario: string
  valorTotal: string
  material: { id: number; codigo: string; nome: string; unidadeMedida: string }
}

export interface ItemServicoOrcamento {
  id: number
  servicoId: number
  descricaoAdicional: string | null
  quantidade: string
  valorUnitario: string
  valorTotal: string
  servico: { id: number; nome: string; unidadeMedida: string }
}

export interface ProjetoDoOrcamento {
  id: number
  responsavelId: number
  status: string
  previsaoInicio: string | null
  previsaoConclusao: string | null
}

export interface Orcamento {
  id: number
  /** "0001" (sem o #). */
  numero: string
  titulo: string
  tipo: TipoOrcamento
  clienteId: number
  dataEmissao: string
  status: StatusOrcamento
  desconto: string
  valorTotal: string
  modalidadePagamento: ModalidadePagamento
  numeroParcelas: number | null
  dataPrimeiroVencimento: string | null
  prazoEstimadoDias: number
  observacoes: string | null
  cliente: ClienteDoOrcamento
  materiais: ItemMaterialOrcamento[]
  servicos: ItemServicoOrcamento[]
  projeto: ProjetoDoOrcamento | null
}

export interface IndicadoresOrcamentos {
  /** PENDENTE + EM_ANALISE + REPROVADO (globais, ignoram os filtros). */
  emAberto: number
  pendentes: number
  emAnalise: number
}

export interface ListaOrcamentos extends Paginado<Orcamento> {
  indicadores: IndicadoresOrcamentos
}

export interface FiltrosOrcamentos {
  busca?: string
  status?: StatusOrcamento
  tipo?: TipoOrcamento
  page?: number
  limit?: number
}

export interface OpcaoMaterial {
  id: number
  codigo: string
  nome: string
  categoria: string
  unidadeMedida: string
  precoReferencia: string
}

export interface OpcaoServico {
  id: number
  nome: string
  /** Mesmo valor do tipo do orçamento: só serviços com `categoria === tipo` entram. */
  categoria: string
  unidadeMedida: string
  valorReferencia: string
}

export interface MaterialPayload {
  materialId: number
  quantidade: number
  valorUnitario: number
}

export interface ServicoPayload {
  servicoId: number
  descricaoAdicional?: string
  quantidade: number
  valorUnitario: number
}

export interface OrcamentoPayload {
  titulo: string
  tipo: TipoOrcamento
  clienteId: number
  prazoEstimadoDias: number
  observacoes?: string
  materiais?: MaterialPayload[]
  servicos?: ServicoPayload[]
}

export type OrcamentoAtualizacao = Partial<OrcamentoPayload>

/** Status que o usuário pode definir pela tela (APROVADO só pela aprovação). */
export type StatusDefinivel = Exclude<StatusOrcamento, 'APROVADO'>

export interface AprovarOrcamentoPayload {
  responsavelId: number
  previsaoInicio: string
  previsaoConclusao: string
  cepObra: string
  cidadeObra: string
  estadoObra: string
  ruaObra: string
  numeroObra: string
  bairroObra: string
  complementoObra?: string
}

export interface RespostaAprovacao {
  mensagem: string
  projeto: {
    id: number
    orcamentoId: number
    responsavelId: number
    status: string
    responsavel: { id: number; nomeCompleto: string; funcao: string }
  }
}
