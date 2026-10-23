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

/** 12345678000195 -> 12.345.678/0001-95 (mantém o valor original se não tiver 14 dígitos). */
export function formatarCnpj(valor: string): string {
  const d = somenteDigitos(valor)
  if (d.length !== 14) return valor
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** Máscara progressiva de CNPJ (aceita digitação parcial). */
export function mascararCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** CPF (11 dígitos) ou CNPJ (14) formatado; outros tamanhos voltam como vieram. */
export function formatarCpfCnpj(valor: string | null | undefined): string {
  if (!valor) return ''
  const d = somenteDigitos(valor)
  if (d.length === 11) return formatarCpf(d)
  if (d.length === 14) return formatarCnpj(d)
  return valor
}

/** Texto sem acentos, em minúsculas e com espaços simples: serve para comparar nomes ("Ji-Paraná" = "ji-parana"). */
export function normalizarTexto(valor: string): string {
  return semAcento(valor).toLowerCase().replace(/\s+/g, ' ').trim()
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

/**
 * Digitação em centavos: "450000" -> "R$ 4.500,00". Sem dígitos, devolve vazio.
 * `digitos` limita o tamanho (padrão 10; o cadastro de serviços usa 12, como o DECIMAL(12,2) da API).
 */
export function mascararMoeda(valor: string, digitos = 10): string {
  const d = somenteDigitos(valor).slice(0, digitos)
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

/** Valor decimal da API (número ou texto, ex.: "1545.50") -> centavos inteiros. */
export function paraCentavos(valor: string | number): number {
  return Math.round(Number(valor) * 100)
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

// Palavras de valores legados em caixa alta que perderam o acento ao virar enum.
const ACENTOS_LEGADOS: Record<string, string> = {
  nao: 'não',
  periodo: 'período',
  servico: 'serviço',
  funcao: 'função',
  conjuge: 'cônjuge',
  autonomo: 'autônomo',
  temporario: 'temporário',
  estagio: 'estágio',
}

/**
 * Valor legado em CAIXA_ALTA ("NAO_INFORMADO", "ADMINISTRADOR") -> texto legível ("Não informado",
 * "Administrador"). Valores já escritos normalmente e siglas de até 4 letras passam sem mudança. Só exibição: nunca regrave o resultado.
 */
export function rotuloLegivel(valor: string | null | undefined): string {
  if (!valor) return ''
  if (!/^[A-ZÀ-Ý0-9_ ]+$/.test(valor) || !/[A-ZÀ-Ý]/.test(valor)) return valor
  // Siglas curtas (CLT, PJ, UF) são nomes próprios: ficam como estão.
  if (!valor.includes('_') && valor.length <= 4) return valor
  const palavras = valor
    .toLowerCase()
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((p) => ACENTOS_LEGADOS[p] ?? p)
  const texto = palavras.join(' ')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * Instante com hora (campo DateTime da API, em UTC: "2026-08-02T00:30:00.000Z") -> "01/08/2026" no relógio local.
 * Campos só de data (@db.Date, ex.: "2026-08-01T00:00:00.000Z") NÃO usam esta função: eles vão por `isoParaDataBr`,
 * que corta a string e evita o dia anterior/seguinte por causa do fuso.
 */
export function instanteParaDataBr(valor: string | null | undefined): string {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()}`
}

/**
 * Instante com hora -> "01/08/2026" no fuso do negócio (America/Porto_Velho, o mesmo do backend), não no relógio do
 * navegador: "02/08 00:30 UTC" é 01/08 em Porto Velho em qualquer máquina. Sem Intl cai no relógio local.
 */
export function instanteParaDataBrNegocio(valor: string | null | undefined): string {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  try {
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Porto_Velho',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(data)
    const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value
    if (pega('day') && pega('month') && pega('year')) return `${pega('day')}/${pega('month')}/${pega('year')}`
  } catch {
    // Intl indisponível: usa o relógio local abaixo.
  }
  return instanteParaDataBr(valor)
}

/**
 * ISO com hora ("2026-07-16T18:32:00.000Z") -> "16/07/2026 14:32" no fuso do negócio (America/Porto_Velho, o mesmo
 * das datas e do backend), igual em qualquer máquina; inválido -> vazio. Sem Intl cai no relógio local.
 */
export function formatarDataHoraIso(valor: string | null | undefined): string {
  if (!valor) return ''
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return ''
  try {
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Porto_Velho',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(data)
    const pega = (tipo: string) => partes.find((p) => p.type === tipo)?.value
    const [dia, mes, ano, hora, minuto] = [pega('day'), pega('month'), pega('year'), pega('hour'), pega('minute')]
    if (dia && mes && ano && hora && minuto) return `${dia}/${mes}/${ano} ${hora}:${minuto}`
  } catch {
    // Intl indisponível: usa o relógio local abaixo.
  }
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${dois(data.getDate())}/${dois(data.getMonth() + 1)}/${data.getFullYear()} ${dois(data.getHours())}:${dois(data.getMinutes())}`
}

/**
 * Termo de busca digitado com máscara de CPF/celular ("470.785.102-91", "(69) 99612-4387") -> só dígitos,
 * que é como a API guarda. Termos com letras ou com menos de 3 dígitos seguem como foram digitados.
 */
export function termoDeBusca(termo: string): string {
  const semMascara = termo.replace(/[.\-() /]/g, '')
  return /^\d{3,}$/.test(semMascara) ? semMascara : termo
}

/** Nome para enviar à API: sem espaços nas pontas e com espaços/tabs repetidos no meio reduzidos a um ("Tubo   20x20" -> "Tubo 20x20"). */
export function limparEspacos(texto: string): string {
  return texto.trim().replace(/[ \t]{2,}/g, ' ')
}

/**
 * Remove só os acentos, preservando maiúsculas e espaços (a mensagem da API ainda precisa mostrar nomes de materiais).
 * Base de `normalizarTexto`; para comparar texto livre use `normalizarTexto`.
 */
export function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
