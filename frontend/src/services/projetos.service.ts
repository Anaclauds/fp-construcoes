import { api } from './api'
import type { OpcaoMaterial, OpcaoServico } from '../types/orcamento'
import type {
  EditarEtapaPayload,
  EditarExtraPayload,
  EditarProjetoPayload,
  EtapaPayload,
  ExtraPayload,
  FiltrosProjetos,
  FormasPagamentoDaModalidade,
  IniciarProjetoPayload,
  ListaProjetos,
  ProjetoDetalhe,
  RespostaProjeto,
  SimulacaoCobranca,
  SimularCobrancaPayload,
  StatusFinalProjeto,
} from '../types/projeto'

export async function listarProjetos(filtros: FiltrosProjetos = {}): Promise<ListaProjetos> {
  const { data } = await api.get<ListaProjetos>('/projetos', { params: filtros })
  return data
}

export async function buscarProjeto(id: number): Promise<ProjetoDetalhe> {
  const { data } = await api.get<ProjetoDetalhe>(`/projetos/${id}`)
  return data
}

/** Iniciar devolve o projeto atualizado (mesmo formato de `buscarProjeto`), sem `avisos`. */
export async function iniciarProjeto(id: number, payload: IniciarProjetoPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/iniciar`, payload)
  return data
}

/**
 * Concluir ou cancelar. `dataConclusao` (YYYY-MM-DD) só vale ao concluir (o servidor recusa ao cancelar).
 * A resposta traz `avisos` e, ao cancelar, `cancelamento` (cobranças canceladas/mantidas e reservas liberadas).
 */
export async function alterarStatusProjeto(
  id: number,
  status: StatusFinalProjeto,
  dataConclusao?: string,
): Promise<RespostaProjeto> {
  const corpo = status === 'CONCLUIDO' && dataConclusao ? { status, dataConclusao } : { status }
  const { data } = await api.patch<RespostaProjeto>(`/projetos/${id}/status`, corpo)
  return data
}

/** Etapa de medição (Construção Civil); devolve o projeto atualizado. */
export async function registrarEtapa(id: number, payload: EtapaPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.post<ProjetoDetalhe>(`/projetos/${id}/etapas`, payload)
  return data
}

/** Extra do projeto (materiais, serviços e gastos avulsos); devolve o projeto atualizado. */
export async function registrarExtra(id: number, payload: ExtraPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.post<ProjetoDetalhe>(`/projetos/${id}/extras`, payload)
  return data
}

/** Responsável, previsões (null limpa) e endereço da obra (projeto planejado ou em execução). Devolve o projeto atualizado. */
export async function editarProjeto(id: number, payload: EditarProjetoPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}`, payload)
  return data
}

/** Descrição e data de uma etapa (só sem recebimento na cobrança dela). */
export async function editarEtapa(id: number, etapaId: number, payload: EditarEtapaPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/etapas/${etapaId}`, payload)
  return data
}

/** Justificativa e data de um extra (a data não muda se o extra já gerou despesa). */
export async function editarExtra(id: number, extraId: number, payload: EditarExtraPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/extras/${extraId}`, payload)
  return data
}

/**
 * Cancela uma etapa (PATCH, nunca DELETE): o registro continua no histórico com `canceladoEm`. Sem recebimento na
 * cobrança dela, a cobrança e as parcelas são canceladas. Devolve o projeto atualizado; repetir dá 409.
 */
export async function cancelarEtapa(id: number, registroId: number, motivo: string): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/etapas/${registroId}/cancelar`, { motivo })
  return data
}

/** Cancela um extra: libera as reservas ativas e estorna a despesa vinculada. Devolve o projeto atualizado. */
export async function cancelarExtra(id: number, registroId: number, motivo: string): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/extras/${registroId}/cancelar`, { motivo })
  return data
}

/** Modalidades (à vista, parcelado) com as formas aceitas em cada uma e se aceitam acréscimo. */
export async function listarFormasPagamento(): Promise<FormasPagamentoDaModalidade[]> {
  const { data } = await api.get<FormasPagamentoDaModalidade[]>('/projetos/opcoes/formas-pagamento')
  return data
}

/** Prévia das parcelas do iniciar (sem `valorCobrado`) ou de uma medição (com ele). Não grava nada. */
export async function simularCobrancaDoProjeto(id: number, payload: SimularCobrancaPayload): Promise<SimulacaoCobranca> {
  const { data } = await api.post<SimulacaoCobranca>(`/projetos/${id}/cobranca/simular`, payload)
  return data
}

/** Materiais ativos com o saldo de estoque livre (`saldoDisponivel`). */
export async function listarMateriaisDoProjeto(): Promise<OpcaoMaterial[]> {
  const { data } = await api.get<OpcaoMaterial[]>('/projetos/opcoes/materiais')
  return data
}

/** Serviços ativos de todas as categorias: o filtro pela categoria do projeto é feito na tela. */
export async function listarServicosDoProjeto(): Promise<OpcaoServico[]> {
  const { data } = await api.get<OpcaoServico[]>('/projetos/opcoes/servicos')
  return data
}
