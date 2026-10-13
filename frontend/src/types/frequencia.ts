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
  /** Obrigatoria para MEIO_PERIODO e FALTA_JUSTIFICADA. */
  observacao?: string
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

export interface RelatorioFrequencia {
  funcionario: FuncionarioFrequencia
  periodo: { dataInicial: string; dataFinal: string }
  tipoRelatorio: string
  indicadores: Indicadores & { taxaPresenca: number }
  registros: Frequencia[]
}

export interface FiltrosRelatorio {
  funcionarioId: number
  dataInicial: string
  dataFinal: string
  status?: StatusFrequencia
}
