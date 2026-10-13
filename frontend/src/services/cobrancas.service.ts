import { api } from './api'
import type {
  Cobranca,
  FiltrosCobrancas,
  FormatoRelatorioCobrancas,
  ListaCobrancas,
  ProjetoCobrancasDetalhe,
  RecebimentoPayload,
} from '../types'

export async function listarCobrancas(filtros: FiltrosCobrancas = {}): Promise<ListaCobrancas> {
  const { data } = await api.get<ListaCobrancas>('/cobrancas', { params: filtros })
  return data
}

/** Projeto com todas as cobranças e parcelas. 404 quando o projeto não tem cobranças. */
export async function buscarCobrancasDoProjeto(projetoId: number): Promise<ProjetoCobrancasDetalhe> {
  const { data } = await api.get<ProjetoCobrancasDetalhe>(`/cobrancas/projetos/${projetoId}`)
  return data
}

/** Cobrança com recebimentos e quem os registrou. */
export async function buscarCobranca(id: number): Promise<Cobranca> {
  const { data } = await api.get<Cobranca>(`/cobrancas/${id}`)
  return data
}

/** A resposta é a cobrança atualizada (mesmo formato de `buscarCobranca`). */
export async function registrarRecebimento(cobrancaId: number, payload: RecebimentoPayload): Promise<Cobranca> {
  const { data } = await api.post<Cobranca>(`/cobrancas/${cobrancaId}/recebimentos`, payload)
  return data
}

export interface ArquivoBaixado {
  blob: Blob
  /** Nome sugerido pelo servidor (Content-Disposition) ou, se o navegador não expuser o cabeçalho, um padrão. */
  nome: string
}

/** Relatório com os mesmos filtros da lista (sem paginação), baixado como arquivo com o token da sessão. */
export async function exportarRelatorioCobrancas(
  formato: FormatoRelatorioCobrancas,
  filtros: FiltrosCobrancas = {},
): Promise<ArquivoBaixado> {
  const resposta = await api.get<Blob>(`/cobrancas/relatorios/exportar/${formato}`, {
    params: filtros,
    responseType: 'blob',
  })
  const disposicao = String(resposta.headers['content-disposition'] ?? '')
  const nomeServidor = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposicao)?.[1]
  const extensao = formato === 'pdf' ? 'pdf' : 'xlsx'
  return { blob: resposta.data, nome: nomeServidor ? decodeURIComponent(nomeServidor) : `relatorio-cobrancas.${extensao}` }
}
