import { api } from './api'
import type { OpcaoMaterial, OpcaoServico } from '../types/orcamento'
import type {
  EtapaPayload,
  ExtraPayload,
  FiltrosProjetos,
  IniciarProjetoPayload,
  ListaProjetos,
  ProjetoDetalhe,
  StatusFinalProjeto,
} from '../types/projeto'

export async function listarProjetos(filtros: FiltrosProjetos = {}): Promise<ListaProjetos> {
  const { data } = await api.get<ListaProjetos>('/projetos', { params: filtros })
  return data
}

/**
 * Quantos projetos estão planejados. A lista só devolve os indicadores total, em execução e concluídos;
 * o planejado vem do `meta.total` de uma consulta filtrada por status (1 registro, só para contar).
 */
export async function contarProjetosPlanejados(): Promise<number> {
  const { meta } = await listarProjetos({ status: 'PLANEJADO', page: 1, limit: 1 })
  return meta.total
}

export async function buscarProjeto(id: number): Promise<ProjetoDetalhe> {
  const { data } = await api.get<ProjetoDetalhe>(`/projetos/${id}`)
  return data
}

/** Iniciar devolve o projeto atualizado (mesmo formato de `buscarProjeto`). */
export async function iniciarProjeto(id: number, payload: IniciarProjetoPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/iniciar`, payload)
  return data
}

export async function alterarStatusProjeto(id: number, status: StatusFinalProjeto): Promise<ProjetoDetalhe> {
  const { data } = await api.patch<ProjetoDetalhe>(`/projetos/${id}/status`, { status })
  return data
}

export async function registrarEtapa(id: number, payload: EtapaPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.post<ProjetoDetalhe>(`/projetos/${id}/etapas`, payload)
  return data
}

export async function registrarExtra(id: number, payload: ExtraPayload): Promise<ProjetoDetalhe> {
  const { data } = await api.post<ProjetoDetalhe>(`/projetos/${id}/extras`, payload)
  return data
}

/** Materiais ativos (sem saldo de estoque). */
export async function listarMateriaisDoProjeto(): Promise<OpcaoMaterial[]> {
  const { data } = await api.get<OpcaoMaterial[]>('/projetos/opcoes/materiais')
  return data
}

/** Serviços ativos de todas as categorias: o filtro pela categoria do projeto é feito na tela. */
export async function listarServicosDoProjeto(): Promise<OpcaoServico[]> {
  const { data } = await api.get<OpcaoServico[]>('/projetos/opcoes/servicos')
  return data
}
