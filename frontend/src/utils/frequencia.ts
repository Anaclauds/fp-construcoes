import type {
  Frequencia,
  Indicadores,
  LinhaRelatorio,
  RelatorioCompleto,
  RelatorioFrequencia,
  StatusFiltroRelatorio,
  StatusFrequencia,
} from '../types'
import { adicionarDias, hojeIso } from './datas'

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
 * Completa o relatório da API (só dias lançados) com os dias sem lançamento do período,
 * de dataInicial até o menor entre dataFinal e hoje. Dias futuros ficam de fora.
 * Com filtro de status, só as linhas daquele status (e taxa de presença indisponível).
 */
export function montarRelatorio(
  api: RelatorioFrequencia,
  filtro: StatusFiltroRelatorio | null,
  hoje: string = hojeIso(),
): RelatorioCompleto {
  const inicio = api.periodo.dataInicial.slice(0, 10)
  const final = api.periodo.dataFinal.slice(0, 10)
  const fim = final < hoje ? final : hoje

  const porData = new Map<string, Frequencia>()
  for (const registro of api.registros) porData.set(registro.data.slice(0, 10), registro)

  // Com filtro de status da API, os dias faltantes não pertencem ao resultado.
  const completar = filtro === null || filtro === 'NAO_REGISTRADO'
  const linhas: LinhaRelatorio[] = []
  if (completar) {
    for (let dia = inicio; dia <= fim; dia = adicionarDias(dia, 1)) {
      const registro = porData.get(dia)
      linhas.push({
        data: dia,
        status: registro?.status ?? null,
        observacao: registro?.observacao?.trim() ?? '',
      })
    }
  } else {
    for (const [dia, registro] of [...porData].sort(([a], [b]) => a.localeCompare(b))) {
      if (dia >= inicio && dia <= fim) {
        linhas.push({ data: dia, status: registro.status, observacao: registro.observacao?.trim() ?? '' })
      }
    }
  }

  const visiveis = filtro === 'NAO_REGISTRADO' ? linhas.filter((l) => l.status === null) : linhas
  const contar = (status: StatusFrequencia | null) => visiveis.filter((l) => l.status === status).length
  const presentes = contar('PRESENTE')

  return {
    funcionario: api.funcionario,
    periodo: { dataInicial: inicio, dataFinal: final },
    linhas: visiveis,
    indicadores: {
      presentes,
      meioPeriodo: contar('MEIO_PERIODO'),
      faltasJustificadas: contar('FALTA_JUSTIFICADA'),
      faltasNaoJustificadas: contar('FALTA_NAO_JUSTIFICADA'),
      naoRegistrados: contar(null),
      totalDias: visiveis.length,
      taxaPresenca: filtro ? null : linhas.length ? Math.round((presentes / linhas.length) * 100) : 0,
    },
    periodoFuturo: inicio > hoje,
    temDiasFuturos: final > hoje,
  }
}
