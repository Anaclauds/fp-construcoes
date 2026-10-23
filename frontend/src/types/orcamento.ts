import type { Paginado } from './paginado'

export type TipoOrcamento = 'CONSTRUCAO_CIVIL' | 'SERRALHERIA' | 'CALHAS'

export type StatusOrcamento = 'PENDENTE' | 'EM_ANALISE' | 'APROVADO' | 'REPROVADO' | 'CANCELADO'

export type ModalidadePagamento = 'A_VISTA' | 'PARCELADO_MANUAL' | 'PARCELADO_AUTOMATICO'

/** Cliente que a API devolve dentro do orçamento (com endereço, mesmo que o cliente esteja inativo). */
export interface ClienteDoOrcamento {
  id: number
  nome: string
  telefone: string
  cep: string | null
  rua: string | null
  numero: string | null
  bairro: string | null
  complemento: string | null
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
  /** PENDENTE + EM_ANALISE, respeitando busca e tipo (o filtro de status não vale para os cartões). */
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
  /** Estoque livre (atual menos reservado); só vem em `/projetos/opcoes/materiais`. */
  saldoDisponivel?: number
  /** Item histórico do orçamento que já não está na lista de ativos: aparece só para manter o vínculo. */
  inativo?: boolean
}

export interface OpcaoServico {
  id: number
  nome: string
  /** Mesmo valor do tipo do orçamento: só serviços com `categoria === tipo` entram. */
  categoria: string
  unidadeMedida: string
  valorReferencia: string
  /** Item histórico do orçamento que já não está na lista de ativos: aparece só para manter o vínculo. */
  inativo?: boolean
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

/** Corpo de `POST /orcamentos/simular` (mesmos itens do cadastro; nada é gravado). */
export interface SimularOrcamentoPayload {
  tipo: TipoOrcamento
  materiais?: MaterialPayload[]
  servicos?: ServicoPayload[]
  desconto?: number
}

/** Resposta da simulação: decimais do Prisma chegam como string ("0.06"). */
export interface SimulacaoOrcamento {
  totalMateriais: string
  totalServicos: string
  desconto: string
  valorTotal: string
}

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

/** Cliente de `GET /orcamentos/opcoes/clientes[/:id]` (só ativos; sem CPF/CNPJ e e-mail). */
export interface OpcaoClienteOrcamento {
  id: number
  nome: string
  razaoSocial: string | null
  nomeFantasia: string | null
  tipo: 'PF' | 'PJ' | null
  cidade: string
  estado: string
  bairro: string | null
  complemento: string | null
  telefone?: string
  /** CEP, rua e número só vêm em `/opcoes/clientes/:id` (um cliente), não na lista. */
  cep?: string | null
  rua?: string | null
  numero?: string | null
}

/** Funcionário ativo de `GET /orcamentos/opcoes/responsaveis`. */
export interface OpcaoResponsavel {
  id: number
  nomeCompleto: string
  funcao: string
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
