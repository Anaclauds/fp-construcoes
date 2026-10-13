const DIAS_DA_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

const dois = (n: number) => String(n).padStart(2, '0')

/** Data de hoje (YYYY-MM-DD) no relógio local; toISOString() viraria o dia às 21h em Rondônia/Brasília. */
export function hojeIso(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`
}

/** "2026-08-20" (ou ISO completo) tem formato e calendário válidos? */
export function isoValido(valor: string | null | undefined): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return false
  const [ano, mes, dia] = valor.slice(0, 10).split('-').map(Number) as [number, number, number]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

/** Soma (ou subtrai) dias de uma data ISO sem passar por fuso horário. */
export function adicionarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return `${data.getUTCFullYear()}-${dois(data.getUTCMonth() + 1)}-${dois(data.getUTCDate())}`
}

/** "2026-08-20" -> "Quinta-feira". */
export function diaDaSemana(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  return DIAS_DA_SEMANA[new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()] ?? ''
}

/** Relógio local: "16/07/2026 às 14:32". */
export function formatarDataHora(data: Date = new Date()): string {
  const dia = `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()}`
  return `${dia} às ${dois(data.getHours())}:${dois(data.getMinutes())}`
}
