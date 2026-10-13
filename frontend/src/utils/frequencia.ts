import type { Frequencia, Indicadores, StatusFrequencia } from '../types'

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
