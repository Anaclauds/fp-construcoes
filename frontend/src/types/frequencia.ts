import type { StatusCadastro } from './funcionario'

export type StatusFrequencia =
  | 'PRESENTE'
  | 'MEIO_PERIODO'
  | 'FALTA_JUSTIFICADA'
  | 'FALTA_NAO_JUSTIFICADA'

export interface FuncionarioFrequencia {
  id: number
  nomeCompleto: string
  apelido: string | null
  funcao: string
  status: StatusCadastro
}

export interface Frequencia {
  /** null quando o funcionario ainda nao tem registro no dia. */
  id: number | null
  funcionarioId: number
  data: string
  status: StatusFrequencia | null
  observacao: string | null
  registradoPorUsuarioId: number | null
  funcionario: FuncionarioFrequencia
}

export interface Indicadores {
  funcionariosAtivos: number
  totalRegistros?: number
  naoRegistrados: number
  presentes: number
  meioPeriodo: number
  faltasJustificadas: number
  faltasNaoJustificadas: number
}

export interface FolhaFrequencia {
  data: string
  indicadores: Indicadores
  registros: Frequencia[]
}

export interface RegistroFrequenciaPayload {
  funcionarioId: number
  status: StatusFrequencia
  /** Obrigatoria para MEIO_PERIODO e FALTA_JUSTIFICADA. null limpa a salva; omitida mantém a atual. */
  observacao?: string | null
}

export interface SalvarFolhaPayload {
  data: string
  registros: RegistroFrequenciaPayload[]
}

export interface FiltrosFolha {
  data?: string
  funcionarioId?: number
  status?: StatusFrequencia
}

/** Dia do período, já completo pela API (até hoje); status null = dia sem lançamento. */
export interface DiaRelatorio {
  /** ISO com hora (ex.: 2026-08-01T00:00:00.000Z); usar só os 10 primeiros caracteres. */
  data: string
  diaSemana: number
  status: StatusFrequencia | null
  observacao: string | null
}

/** Indicadores do período inteiro (não mudam com o filtro de status). */
export interface IndicadoresRelatorioApi extends Indicadores {
  totalDias: number
  /** null quando há filtro de status. */
  taxaPresenca: number | null
}

export interface RelatorioFrequencia {
  funcionario: Pick<FuncionarioFrequencia, 'id' | 'nomeCompleto' | 'apelido' | 'funcao'>
  periodo: { dataInicial: string; dataFinal: string }
  tipoRelatorio: string
  indicadores: IndicadoresRelatorioApi
  registros: Frequencia[]
  /** Dias do período até hoje, já filtrados pelo status pedido. */
  dias: DiaRelatorio[]
}

/** Filtro de status do relatório; NAO_REGISTRADO = dias sem lançamento (aceito pela API). */
export type StatusFiltroRelatorio = StatusFrequencia | 'NAO_REGISTRADO'

export interface FiltrosRelatorio {
  funcionarioId: number
  dataInicial: string
  dataFinal: string
  status?: StatusFiltroRelatorio
}

export interface LinhaRelatorio {
  /** YYYY-MM-DD */
  data: string
  /** null = dia sem lançamento ("Não registrado"). */
  status: StatusFrequencia | null
  observacao: string
}

export interface IndicadoresRelatorio {
  presentes: number
  meioPeriodo: number
  faltasJustificadas: number
  faltasNaoJustificadas: number
  naoRegistrados: number
  /** Dias do período (indicador da API). */
  totalDias: number
  /** Percentual inteiro da API; null quando há filtro de status ("—"). */
  taxaPresenca: number | null
}

/** Relatório já completado no front: cada dia do período (até hoje) vira uma linha. */
export interface RelatorioCompleto {
  funcionario: RelatorioFrequencia['funcionario']
  periodo: { dataInicial: string; dataFinal: string }
  linhas: LinhaRelatorio[]
  indicadores: IndicadoresRelatorio
  /** O período inteiro está depois de hoje. */
  periodoFuturo: boolean
  /** Parte do período está depois de hoje e ficou de fora. */
  temDiasFuturos: boolean
}
