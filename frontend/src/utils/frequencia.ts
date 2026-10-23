import type {
  Frequencia,
  Indicadores,
  RelatorioCompleto,
  RelatorioFrequencia,
  StatusFiltroRelatorio,
  StatusFrequencia,
} from '../types'
import { hojeIso } from './datas'

/** Limite do relatório na API: do início até o fim (ou hoje, o que vier antes) no máximo 3660 dias (~10 anos). */
const DIAS_MAXIMOS_RELATORIO = 3660

/** True se o período (ISO) passa do limite que a API aceita; dias futuros não contam, como no backend. */
export function periodoExcedeLimite(dataInicial: string, dataFinal: string, hoje = hojeIso()): boolean {
  const limite = dataFinal < hoje ? dataFinal : hoje
  const dia = (iso: string) => {
    const [ano, mes, d] = iso.split('-').map(Number) as [number, number, number]
    return Date.UTC(ano, mes - 1, d)
  }
  return (dia(limite) - dia(dataInicial)) / 86_400_000 > DIAS_MAXIMOS_RELATORIO
}

export const STATUS_FREQUENCIA: readonly StatusFrequencia[] = [
  'PRESENTE',
  'MEIO_PERIODO',
  'FALTA_JUSTIFICADA',
  'FALTA_NAO_JUSTIFICADA',
]

export const ROTULO_STATUS: Record<StatusFrequencia, string> = {
  PRESENTE: 'Presente',
  MEIO_PERIODO: 'Meio Período',
  FALTA_JUSTIFICADA: 'Falta Justificada',
  FALTA_NAO_JUSTIFICADA: 'Falta Não Justificada',
}

/** Rótulos curtos dos botões da folha (Figma). */
export const ROTULO_CURTO_STATUS: Record<StatusFrequencia, string> = {
  PRESENTE: 'Presente',
  MEIO_PERIODO: 'Meio Período',
  FALTA_JUSTIFICADA: 'F. Justificada',
  FALTA_NAO_JUSTIFICADA: 'F. N. Justif.',
}

/** Rótulos mínimos dos botões da folha, para os quatro caberem numa linha (o nome completo vai no title). */
export const ROTULO_BOTAO_STATUS: Record<StatusFrequencia, string> = {
  PRESENTE: 'Presente',
  MEIO_PERIODO: 'Meio Per.',
  FALTA_JUSTIFICADA: 'F. Just.',
  FALTA_NAO_JUSTIFICADA: 'F. N. Just.',
}

const CLASSE_STATUS: Record<StatusFrequencia, string> = {
  PRESENTE: 'fp-status--presente',
  MEIO_PERIODO: 'fp-status--meio-periodo',
  FALTA_JUSTIFICADA: 'fp-status--falta-justificada',
  FALTA_NAO_JUSTIFICADA: 'fp-status--falta-nao-justificada',
}

/** Sem registro (status null) nunca é presença: aparece como "Não registrado". */
export function rotuloStatus(status: StatusFrequencia | null): string {
  return status ? ROTULO_STATUS[status] : 'Não registrado'
}

/** Classe global (style.css) que define as cores do status. */
export function classeStatus(status: StatusFrequencia | null): string {
  return status ? CLASSE_STATUS[status] : 'fp-status--nenhum'
}

/** Meio Período e Falta Justificada só são aceitos pela API com observação. */
export function exigeObservacao(status: StatusFrequencia | null): boolean {
  return status === 'MEIO_PERIODO' || status === 'FALTA_JUSTIFICADA'
}

/** Mesma contagem da API, para atualizar os cards enquanto a folha é editada. */
export function calcularIndicadores(registros: Pick<Frequencia, 'status'>[]): Indicadores {
  const contar = (status: StatusFrequencia | null) => registros.filter((r) => r.status === status).length
  return {
    funcionariosAtivos: registros.length,
    naoRegistrados: contar(null),
    presentes: contar('PRESENTE'),
    meioPeriodo: contar('MEIO_PERIODO'),
    faltasJustificadas: contar('FALTA_JUSTIFICADA'),
    faltasNaoJustificadas: contar('FALTA_NAO_JUSTIFICADA'),
  }
}

/** Linha da folha do dia, achatada para a tabela. */
export interface LinhaFolha {
  funcionarioId: number
  /** null enquanto não há registro no dia. */
  id: number | null
  nome: string
  apelido: string | null
  funcao: string
  status: StatusFrequencia | null
  observacao: string
}

export function paraLinhaFolha(registro: Frequencia): LinhaFolha {
  return {
    funcionarioId: registro.funcionarioId,
    id: registro.id,
    nome: registro.funcionario.nomeCompleto,
    apelido: registro.funcionario.apelido,
    funcao: registro.funcionario.funcao,
    status: registro.status,
    observacao: registro.observacao ?? '',
  }
}

/** Rótulo do filtro de status do relatório (inclui "Não registrado"). */
export function rotuloFiltroRelatorio(filtro: StatusFiltroRelatorio): string {
  return filtro === 'NAO_REGISTRADO' ? 'Não registrado' : ROTULO_STATUS[filtro]
}

/**
 * Adapta o relatório da API para a tela. Dias, período e indicadores (incluindo a taxa, que é
 * null com filtro de status) vêm prontos da API; aqui só se formatam datas e se marcam períodos futuros.
 */
export function montarRelatorio(api: RelatorioFrequencia, hoje: string = hojeIso()): RelatorioCompleto {
  const inicio = api.periodo.dataInicial.slice(0, 10)
  const final = api.periodo.dataFinal.slice(0, 10)
  const i = api.indicadores

  return {
    funcionario: api.funcionario,
    periodo: { dataInicial: inicio, dataFinal: final },
    linhas: api.dias.map((dia) => ({
      data: dia.data.slice(0, 10),
      status: dia.status,
      observacao: dia.observacao?.trim() ?? '',
    })),
    indicadores: {
      presentes: i.presentes,
      meioPeriodo: i.meioPeriodo,
      faltasJustificadas: i.faltasJustificadas,
      faltasNaoJustificadas: i.faltasNaoJustificadas,
      naoRegistrados: i.naoRegistrados,
      totalDias: i.totalDias,
      taxaPresenca: i.taxaPresenca,
    },
    periodoFuturo: inicio > hoje,
    temDiasFuturos: final > hoje,
  }
}
