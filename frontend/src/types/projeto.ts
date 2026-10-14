import type { Cliente } from './cliente'
import type { FormaPagamento, StatusCobranca, StatusParcela, TipoCobranca } from './cobranca'
import type { ItemMaterialOrcamento, ItemServicoOrcamento, TipoOrcamento } from './orcamento'
import type { Paginado } from './paginado'

export type StatusProjeto = 'PLANEJADO' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'CANCELADO'

/** Modalidades que as telas usam (a API também aceita PARCELADO_MANUAL, que não é usado aqui). */
export type ModalidadeCobrancaProjeto = 'A_VISTA' | 'PARCELADO_AUTOMATICO'

/** Decimais do Prisma chegam como string; datas `@db.Date` chegam em ISO ("2026-10-01T00:00:00.000Z"): use `slice(0, 10)`. */
export interface ResponsavelProjeto {
  id: number
  nomeCompleto: string
  funcao: string
}

export interface OrcamentoDoProjetoResumo {
  id: number
  /** "0001" (sem o #). */
  numero: string
  titulo: string
  tipo: TipoOrcamento
  clienteId: number
  valorTotal: string
  desconto: string
  cliente: Cliente
}

export interface ProjetoBase {
  id: number
  orcamentoId: number
  responsavelId: number
  status: StatusProjeto
  dataInicio: string | null
  previsaoInicio: string | null
  previsaoConclusao: string | null
  dataConclusao: string | null
  cepObra: string
  cidadeObra: string
  estadoObra: string
  ruaObra: string
  numeroObra: string
  bairroObra: string
  complementoObra: string | null
}

/** Linha da lista (`GET /projetos`). */
export interface ProjetoResumo extends ProjetoBase {
  responsavel: ResponsavelProjeto
  orcamento: OrcamentoDoProjetoResumo
  _count: { etapas: number; extras: number }
}

export interface IndicadoresProjetos {
  totalProjetos: number
  emExecucao: number
  concluidos: number
  /** Só vêm no backend atualizado; sem eles o front conta os planejados com uma consulta extra. */
  planejados?: number
  cancelados?: number
}

export interface ListaProjetos extends Paginado<ProjetoResumo> {
  indicadores: IndicadoresProjetos
}

export interface FiltrosProjetos {
  busca?: string
  status?: StatusProjeto
  tipo?: TipoOrcamento
  page?: number
  limit?: number
}

/** Parcela como o detalhe do projeto devolve (sem recebimentos). */
export interface ParcelaProjeto {
  id: number
  cobrancaId: number
  numero: number
  vencimento: string
  valor: string
  status: StatusParcela
  /** Só vem no backend atualizado. */
  vencida?: boolean
}

export interface CobrancaProjeto {
  id: number
  projetoId: number
  etapaId: number | null
  tipo: TipoCobranca
  modalidade: 'A_VISTA' | 'PARCELADO_MANUAL' | 'PARCELADO_AUTOMATICO'
  formaPagamento: FormaPagamento | null
  percentualDesconto: string
  percentualAcrescimo: string
  desconto: string
  acrescimo: string
  valorTotal: string
  status: StatusCobranca
  criadaEm: string
  parcelas: ParcelaProjeto[]
}

interface ServicoResumido {
  id: number
  nome: string
  unidadeMedida: string
  categoria?: string
}

interface MaterialResumido {
  id: number
  codigo: string
  nome: string
  unidadeMedida: string
}

export interface EtapaServicoRegistrada {
  id: number
  servicoId: number
  quantidade: string
  valorUnitario: string
  custoInternoEstimado: string
  servico: ServicoResumido
  /** Descrição própria do serviço na etapa; só vem no backend atualizado. */
  descricao?: string | null
}

export interface EtapaMaterialClienteRegistrado {
  id: number
  nome: string
  quantidade: string
  unidadeMedida: string
}

export interface EtapaRegistrada {
  id: number
  descricao: string
  dataRegistro: string
  custoInternoEstimado: string
  valorCobrado: string
  servicos: EtapaServicoRegistrada[]
  materiaisCliente: EtapaMaterialClienteRegistrado[]
  cobranca: CobrancaProjeto | null
}

export interface ExtraMaterialRegistrado {
  id: number
  materialId: number
  quantidade: string
  custoUnitarioEstimado: string
  material: MaterialResumido
}

export interface ExtraServicoRegistrado {
  id: number
  servicoId: number
  quantidade: string
  custoUnitarioEstimado: string
  servico: ServicoResumido
  /** Só vem no backend atualizado. */
  descricao?: string | null
}

export interface ExtraGastoAvulso {
  id?: number
  descricao: string
  valor: string
}

export interface ExtraRegistrado {
  id: number
  descricaoJustificativa: string
  dataRegistro: string
  custoInternoEstimado: string
  despesaId: number | null
  materiais: ExtraMaterialRegistrado[]
  servicos: ExtraServicoRegistrado[]
  despesa: { id: number; valorTotal: string } | null
  /** Só vem no backend atualizado. */
  gastosAvulsos?: ExtraGastoAvulso[]
}

export interface OrcamentoDoProjetoDetalhe extends OrcamentoDoProjetoResumo {
  materiais: ItemMaterialOrcamento[]
  servicos: ItemServicoOrcamento[]
}

export interface MaterialSemSaldoProjeto {
  id: number
  nome: string
  necessario: number
  disponivel: number
}

/** Saldo do orçamento a medir (Construção Civil). */
export interface MedicoesProjeto {
  valorOrcamento: number
  totalMedido: number
  saldoAMedir: number
}

/** `GET /projetos/:id`. Os campos opcionais só vêm no backend atualizado. */
export interface ProjetoDetalhe extends ProjetoBase {
  responsavel: ResponsavelProjeto & { status: string }
  orcamento: OrcamentoDoProjetoDetalhe
  etapas: EtapaRegistrada[]
  extras: ExtraRegistrado[]
  cobrancas: CobrancaProjeto[]
  /** `false` quando falta saldo para reservar o estoque dos materiais (só em projeto planejado). */
  estoqueSuficiente?: boolean
  materiaisSemSaldo?: MaterialSemSaldoProjeto[]
  medicoes?: MedicoesProjeto | null
}

/** Cobrança que o cancelamento do projeto cancelou ou manteve (resposta de `PATCH /status`). */
export interface CancelamentoProjeto {
  cobrancasCanceladas: { id: number; tipo: string; valorTotal: number; parcelasCanceladas: number }[]
  cobrancasMantidas: { id: number; tipo: string; valorTotal: number; valorRecebido: number; motivo: string }[]
  reservasLiberadas: number
}

/** Resposta de iniciar e de alterar status: o projeto mais, no backend atualizado, avisos e o resultado do cancelamento. */
export type RespostaProjeto = ProjetoDetalhe & {
  avisos?: string[]
  cancelamento?: CancelamentoProjeto | null
}

/* ---------------------------------- Payloads ---------------------------------- */

/** Condição de cobrança (iniciar Serralheria/Calhas e registrar etapa). Datas em YYYY-MM-DD. */
export interface CondicaoCobrancaPayload {
  modalidadeCobranca: ModalidadeCobrancaProjeto
  formaPagamento: FormaPagamento
  descontoPercentual?: number
  acrescimoPercentual?: number
  /** Não enviar em cobrança à vista. */
  numeroParcelas?: number
  primeiroVencimento: string
}

export interface IniciarProjetoPayload extends Partial<CondicaoCobrancaPayload> {
  dataInicio: string
  previsaoConclusao?: string
}

export interface EtapaServicoPayload {
  servicoId: number
  quantidade: number
  valorUnitario: number
  /** Total da linha (não unitário). */
  custoInternoEstimado: number
  /** Detalhe do serviço nesta etapa; só o backend atualizado aceita (o antigo recusa o campo, 400). */
  descricao?: string
}

export interface EtapaMaterialClientePayload {
  nome: string
  quantidade: number
  unidadeMedida: string
}

export interface EtapaPayload extends CondicaoCobrancaPayload {
  /** Data local (YYYY-MM-DD) do registro; sem ela a API grava a data UTC. */
  dataRegistro?: string
  descricao: string
  valorCobrado: number
  servicos: EtapaServicoPayload[]
  materiaisCliente?: EtapaMaterialClientePayload[]
}

export interface ExtraMaterialPayload {
  materialId: number
  quantidade: number
  /** Custo unitário. */
  custoUnitarioEstimado: number
}

export interface ExtraServicoPayload {
  servicoId: number
  quantidade: number
  /** Custo unitário. */
  custoUnitarioEstimado: number
  /** Só o backend atualizado aceita. */
  descricao?: string
}

export interface ExtraGastoAvulsoPayload {
  descricao: string
  valor: number
}

export interface ExtraPayload {
  /** Data local (YYYY-MM-DD) do registro; sem ela a API grava a data UTC. */
  dataRegistro?: string
  descricaoJustificativa: string
  materiais?: ExtraMaterialPayload[]
  servicos?: ExtraServicoPayload[]
  /** Só o backend atualizado aceita; o antigo recusa o campo (400). */
  gastosAvulsos?: ExtraGastoAvulsoPayload[]
}

/** `PATCH /projetos/:id`: só o que mudou. Datas em YYYY-MM-DD; `complementoObra: ''` limpa o complemento. */
export interface EditarProjetoPayload {
  responsavelId?: number
  previsaoInicio?: string
  previsaoConclusao?: string
  cepObra?: string
  cidadeObra?: string
  estadoObra?: string
  ruaObra?: string
  numeroObra?: string
  bairroObra?: string
  complementoObra?: string
}

/** `PATCH /projetos/:id/etapas/:etapaId`. */
export interface EditarEtapaPayload {
  descricao?: string
  dataRegistro?: string
}

/** `PATCH /projetos/:id/extras/:extraId`. */
export interface EditarExtraPayload {
  descricaoJustificativa?: string
  dataRegistro?: string
}

/** Etapa ou extra a corrigir (descrição/justificativa e data; valores, serviços e materiais não mudam). */
export interface RegistroEditavel {
  tipo: 'etapa' | 'extra'
  id: number
  /** Descrição da etapa ou justificativa do extra. */
  texto: string
  /** YYYY-MM-DD (aceita ISO completo). */
  data: string
  /** Extra que já gerou despesa no caixa: a data é a competência do caixa e não muda. */
  dataTravada: boolean
}

export type StatusFinalProjeto = Extract<StatusProjeto, 'CONCLUIDO' | 'CANCELADO'>
