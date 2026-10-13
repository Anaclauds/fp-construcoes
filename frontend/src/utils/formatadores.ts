const somenteDigitos = (valor: string) => valor.replace(/\D/g, '')

/** 12345678900 -> 123.456.789-00 (mantém o valor original se não tiver 11 dígitos). */
export function formatarCpf(valor: string): string {
  const digitos = somenteDigitos(valor)
  if (digitos.length !== 11) return valor
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
}

/** Máscara progressiva de CPF (aceita digitação parcial). */
export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Máscara progressiva de telefone: (00) 0000-0000 ou (00) 00000-0000. */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Máscara progressiva: 76900000 -> 76900-000. */
export function mascararCep(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

/** Máscara progressiva: 15031985 -> 15/03/1985. */
export function mascararData(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Digitação em centavos: "450000" -> "R$ 4.500,00". Sem dígitos, devolve vazio. */
export function mascararMoeda(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 10)
  if (d === '') return ''
  return formatarMoeda(Number(d) / 100)
}

export function formatarMoeda(valor: number | string): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor
  if (!Number.isFinite(numero)) return ''
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ')
}

/** "R$ 4.500,00" -> 4500; vazio -> null. */
export function moedaParaNumero(valor: string): number | null {
  const d = somenteDigitos(valor)
  return d === '' ? null : Number(d) / 100
}

/** Telefone salvo (só dígitos) para exibição; mantém o valor original se o tamanho for inesperado. */
export function formatarTelefone(valor: string): string {
  const d = somenteDigitos(valor)
  return d.length === 10 || d.length === 11 ? mascararTelefone(d) : valor
}

export function formatarCep(valor: string): string {
  const d = somenteDigitos(valor)
  return d.length === 8 ? mascararCep(d) : valor
}

/** ISO ("1985-03-15" ou "1985-03-15T00:00:00.000Z") -> "15/03/1985". Usa só a parte da data, sem fuso. */
export function isoParaDataBr(valor: string): string {
  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : ''
}

/** "15/03/1985" -> "1985-03-15" (assume data já validada). */
export function dataBrParaIso(valor: string): string {
  const [dia, mes, ano] = valor.split('/')
  return `${ano}-${mes}-${dia}`
}
