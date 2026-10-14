import { api, endpointInexistente, propriedadesNaoAceitas } from './api'
import { suporte } from './compatibilidade'
import type { OpcaoMaterial, OpcaoServico } from '../types/orcamento'
import type {
  EditarEtapaPayload,
  EditarExtraPayload,
  EditarProjetoPayload,
  EtapaPayload,
  ExtraPayload,
  FiltrosProjetos,
  IniciarProjetoPayload,
  ListaProjetos,
  ProjetoDetalhe,
  RespostaProjeto,
  StatusFinalProjeto,
} from '../types/projeto'

export async function listarProjetos(filtros: FiltrosProjetos = {}): Promise<ListaProjetos> {
  const { data } = await api.get<ListaProjetos>('/projetos', { params: filtros })
  return data
}

/**
 * Quantos projetos estão planejados. Só o backend antigo precisa disto: o atualizado já devolve
 * `indicadores.planejados`. Aqui o planejado vem do `meta.total` de uma consulta filtrada (1 registro, só para contar).
 */
export async function contarProjetosPlanejados(): Promise<number> {
  const { meta } = await listarProjetos({ status: 'PLANEJADO', page: 1, limit: 1 })
  return meta.total
}

export async function buscarProjeto(id: number): Promise<ProjetoDetalhe> {
  const { data } = await api.get<ProjetoDetalhe>(`/projetos/${id}`)
  return data
}

/** Iniciar devolve o projeto atualizado (mesmo formato de `buscarProjeto`) e, no backend atualizado, `avisos`. */
export async function iniciarProjeto(id: number, payload: IniciarProjetoPayload): Promise<RespostaProjeto> {
  const { data } = await api.patch<RespostaProjeto>(`/projetos/${id}/iniciar`, payload)
  return data
}

/**
 * Concluir ou cancelar. `dataConclusao` (YYYY-MM-DD) só vale ao concluir e só o backend atualizado a aceita:
 * se ele a recusar, reenvia sem ela (o servidor grava hoje) e deixa de oferecer o campo.
 */
export async function alterarStatusProjeto(
  id: number,
  status: StatusFinalProjeto,
  dataConclusao?: string,
): Promise<RespostaProjeto> {
  const enviar = async (corpo: { status: StatusFinalProjeto; dataConclusao?: string }) =>
    (await api.patch<RespostaProjeto>(`/projetos/${id}/status`, corpo)).data

  if (!dataConclusao || status !== 'CONCLUIDO' || !suporte.dataConclusao) return enviar({ status })
  try {
    return await enviar({ status, dataConclusao })
  } catch (e) {
    if (!propriedadesNaoAceitas(e).includes('dataConclusao')) throw e
    suporte.dataConclusao = false
    return enviar({ status })
  }
}

/**
 * Etapa. `legado` é o mesmo registro no formato antigo (detalhe de cada serviço anexado à descrição), usado quando
 * o backend recusa `servicos[].descricao`.
 */
export async function registrarEtapa(id: number, payload: EtapaPayload, legado: EtapaPayload = payload): Promise<ProjetoDetalhe> {
  const enviar = async (corpo: EtapaPayload) => (await api.post<ProjetoDetalhe>(`/projetos/${id}/etapas`, corpo)).data
  if (!suporte.descricaoDoServico) return enviar(legado)
  try {
    return await enviar(payload)
  } catch (e) {
    if (!propriedadesNaoAceitas(e).includes('descricao')) throw e
    suporte.descricaoDoServico = false
    return enviar(legado)
  }
}

/** Extra. Mesma estratégia da etapa para `servicos[].descricao`; `gastosAvulsos` não tem equivalente no formato antigo. */
export async function registrarExtra(id: number, payload: ExtraPayload, legado: ExtraPayload = payload): Promise<ProjetoDetalhe> {
  const enviar = async (corpo: ExtraPayload) => (await api.post<ProjetoDetalhe>(`/projetos/${id}/extras`, corpo)).data
  if (!suporte.descricaoDoServico && !payload.gastosAvulsos) return enviar(legado)
  try {
    return await enviar(payload)
  } catch (e) {
    const recusados = propriedadesNaoAceitas(e)
    if (recusados.includes('gastosAvulsos')) {
      suporte.gastosAvulsos = false
      throw new Error(
        'Este servidor ainda não aceita gastos avulsos no extra. O bloco foi retirado do formulário: lance esses custos em Despesas.',
      )
    }
    if (!recusados.includes('descricao')) throw e
    suporte.descricaoDoServico = false
    return enviar(legado)
  }
}

export const MENSAGEM_EDICAO_INDISPONIVEL = 'Edição indisponível nesta versão do servidor.'

/**
 * Edição de projeto, etapa e extra: rotas que o backend antigo não tem. Um 404 de rota desliga o recurso
 * (`suporte.edicaoProjeto`, as telas escondem as ações até recarregar a página) e vira a mensagem acima.
 */
async function editar(requisicao: () => Promise<{ data: ProjetoDetalhe }>): Promise<ProjetoDetalhe> {
  try {
    return (await requisicao()).data
  } catch (e) {
    if (!endpointInexistente(e)) throw e
    suporte.edicaoProjeto = false
    throw new Error(MENSAGEM_EDICAO_INDISPONIVEL)
  }
}

/** Responsável, previsões e endereço da obra (projeto planejado ou em execução). Devolve o projeto atualizado. */
export function editarProjeto(id: number, payload: EditarProjetoPayload): Promise<ProjetoDetalhe> {
  return editar(() => api.patch<ProjetoDetalhe>(`/projetos/${id}`, payload))
}

/** Descrição e data de uma etapa (só sem recebimento na cobrança dela). */
export function editarEtapa(id: number, etapaId: number, payload: EditarEtapaPayload): Promise<ProjetoDetalhe> {
  return editar(() => api.patch<ProjetoDetalhe>(`/projetos/${id}/etapas/${etapaId}`, payload))
}

/** Justificativa e data de um extra (a data não muda se o extra já gerou despesa). */
export function editarExtra(id: number, extraId: number, payload: EditarExtraPayload): Promise<ProjetoDetalhe> {
  return editar(() => api.patch<ProjetoDetalhe>(`/projetos/${id}/extras/${extraId}`, payload))
}

/** Materiais ativos; o backend atualizado acrescenta o saldo de estoque (`saldoDisponivel`). */
export async function listarMateriaisDoProjeto(): Promise<OpcaoMaterial[]> {
  const { data } = await api.get<OpcaoMaterial[]>('/projetos/opcoes/materiais')
  return data
}

/** Serviços ativos de todas as categorias: o filtro pela categoria do projeto é feito na tela. */
export async function listarServicosDoProjeto(): Promise<OpcaoServico[]> {
  const { data } = await api.get<OpcaoServico[]>('/projetos/opcoes/servicos')
  return data
}
