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

/** Fuso do negócio: o mesmo que o backend usa para "hoje" (APP_TIMEZONE, padrão America/Porto_Velho). */
const FUSO_NEGOCIO = 'America/Porto_Velho'

/**
 * Data de hoje (YYYY-MM-DD) no fuso do negócio, o mesmo "hoje" do backend. Com o relógio do navegador (ou com UTC)
 * o dia virava antes do servidor numa máquina em Brasília e datas como "hoje" eram recusadas como futuras.
 * Sem suporte a fusos no navegador cai no relógio local.
 */
export function hojeIso(): string {
  try {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: FUSO_NEGOCIO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value
    const [ano, mes, dia] = [valor('year'), valor('month'), valor('day')]
    if (ano && mes && dia) return `${ano}-${mes}-${dia}`
  } catch {
    // Intl indisponível: usa o relógio local abaixo.
  }
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
