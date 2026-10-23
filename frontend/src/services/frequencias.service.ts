import { isAxiosError } from 'axios'
import { api } from './api'
import type {
  FuncionarioFrequencia,
  FiltrosFolha,
  FiltrosRelatorio,
  FolhaFrequencia,
  Frequencia,
  RelatorioFrequencia,
  SalvarFolhaPayload,
} from '../types'

/** Folha do dia: todos os funcionários ativos, com ou sem registro. */
export async function buscarFolhaDoDia(filtros: FiltrosFolha = {}): Promise<FolhaFrequencia> {
  const { data } = await api.get<FolhaFrequencia>('/frequencias', { params: filtros })
  return data
}

/** Upsert em lote. No erro de justificativa, use extrairErro().funcionariosPendentes. */
export async function salvarFolha(payload: SalvarFolhaPayload): Promise<FolhaFrequencia> {
  const { data } = await api.post<FolhaFrequencia>('/frequencias', payload)
  return data
}

export async function buscarFrequencia(id: number): Promise<Frequencia> {
  const { data } = await api.get<Frequencia>(`/frequencias/${id}`)
  return data
}

export async function atualizarObservacao(id: number, observacao: string): Promise<Frequencia> {
  const { data } = await api.patch<Frequencia>(`/frequencias/${id}/observacao`, { observacao })
  return data
}

export async function buscarRelatorio(filtros: FiltrosRelatorio): Promise<RelatorioFrequencia> {
  const { data } = await api.get<RelatorioFrequencia>('/frequencias/relatorio', { params: filtros })
  return data
}

/**
 * PDF do relatório (mesmos filtros do JSON). Com `responseType: 'blob'` o corpo do erro também
 * chega como Blob: é lido como JSON e recolocado em `response.data`, para o extrairErro funcionar.
 */
export async function baixarRelatorioPdf(filtros: FiltrosRelatorio): Promise<Blob> {
  try {
    const { data } = await api.get<Blob>('/frequencias/relatorio/pdf', {
      params: filtros,
      responseType: 'blob',
    })
    // Resposta 200 que não é PDF (ex.: página de erro de proxy) não pode virar download.
    if (!data.type.includes('pdf')) throw new Error('O servidor não devolveu um PDF. Tente novamente.')
    return data
  } catch (erro) {
    if (isAxiosError(erro) && erro.response?.data instanceof Blob) {
      try {
        erro.response.data = JSON.parse(await erro.response.data.text())
      } catch {
        erro.response.data = undefined
      }
    }
    throw erro
  }
}

/** Funcionários (ativos e inativos, sem salário) para seletores; exige FREQUENCIA visualizar. */
export async function listarOpcoesFuncionarios(
  status: 'ATIVO' | 'INATIVO' | 'TODOS' = 'TODOS',
): Promise<FuncionarioFrequencia[]> {
  const { data } = await api.get<FuncionarioFrequencia[]>('/frequencias/opcoes/funcionarios', {
    params: { status },
  })
  return data
}
