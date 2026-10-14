/**
 * Decimal pt-BR digitado ou colado: regra única para quantidade, valor unitário e percentual
 * (orçamentos, projetos, estoque e despesas).
 *
 * - com vírgula: a vírgula é o separador decimal e os pontos são milhar ("1.234,56" -> "1234,56");
 * - sem vírgula e no padrão de milhar ("1.000", "2.500.000"): os pontos são milhar ("1000", "2500000");
 * - sem vírgula e fora desse padrão: o primeiro ponto é separador decimal ("12.5" -> "12,5", "1234.56" -> "1234,56");
 * - qualquer outro caractere ("e", "-", "R$", espaços) é ignorado.
 * Limita a `inteiros` dígitos inteiros e `casas` casas decimais.
 */
export function mascararDecimal(valor: string, casas: number, inteiros = 9): string {
  const limpo = valor.replace(/[^\d.,]/g, '')
  let inteira: string
  let fracao: string | null = null
  const virgula = limpo.indexOf(',')
  if (virgula >= 0) {
    inteira = limpo.slice(0, virgula).replace(/\./g, '')
    fracao = limpo.slice(virgula + 1).replace(/[.,]/g, '')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    inteira = limpo.replace(/\./g, '')
  } else {
    const ponto = limpo.indexOf('.')
    if (ponto < 0) {
      inteira = limpo
    } else {
      inteira = limpo.slice(0, ponto)
      fracao = limpo.slice(ponto + 1).replace(/\./g, '')
    }
  }
  inteira = inteira.slice(0, inteiros)
  if (fracao === null) return inteira
  return `${inteira === '' ? '0' : inteira},${fracao.slice(0, casas)}`
}

/** "2,5" -> 2500 (escala 3). Vazio, inválido ou com casas a mais devolve null. */
export function textoParaEscala(texto: string, casas: number): number | null {
  const t = texto.trim()
  if (!/^\d+(,\d*)?$/.test(t)) return null
  const [inteiro = '', fracao = ''] = t.split(',')
  if (fracao.length > casas) return null
  const numero = Number(inteiro + fracao.padEnd(casas, '0'))
  return Number.isSafeInteger(numero) ? numero : null
}
