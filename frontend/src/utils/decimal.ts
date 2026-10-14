/**
 * Decimal pt-BR digitado ou colado: regra única para quantidade, valor unitário e percentual
 * (orçamentos, projetos, estoque e despesas).
 *
 * São duas etapas, porque o papel do ponto só pode ser decidido com o texto inteiro:
 *
 * 1. `filtrarDecimal` roda A CADA TECLA (`:mascara` do CampoFormulario). Só descarta o que não cabe
 *    (letras, sinais, espaços), mantém no máximo uma vírgula e respeita os limites de dígitos. Nunca
 *    converte o ponto em vírgula nem apaga o que o usuário digitou: "1." continua "1." até a próxima
 *    tecla, então "1.000" e "1.234,5" chegam inteiros ao fim da digitação.
 * 2. `normalizarDecimal` roda quando o campo perde o foco (`:normalizar`) e dentro de `textoParaEscala`
 *    / `quantidadeParaNumero` (totais ao vivo e validação, inclusive Enter antes do blur). Aqui o
 *    papel do ponto é decidido, olhando o texto completo:
 *    - com vírgula: a vírgula é o decimal e todos os pontos são milhar ("1.234,5" = 1234,5);
 *    - sem vírgula e no padrão de milhar, ou seja, grupos de EXATAMENTE 3 dígitos depois do ponto
 *      e primeiro grupo de 1 a 3 dígitos sem zero à esquerda ("1.000", "2.500.000", "12.500"):
 *      pontos são milhar ("1.000" = mil, "12.500" = doze mil e quinhentos);
 *    - sem vírgula e fora desse padrão ("12.5", "1234.56", "1.0", "0.001", "1.2345"): o primeiro ponto
 *      é o decimal (colagem de texto em inglês ou teclado de celular que só tem ".").
 *    Convenção para o usuário: milhar tem sempre 3 dígitos depois do ponto; para decimal use a vírgula.
 *    Qualquer outro caractere ("e", "-", "R$", espaços) é ignorado ("1e3" vira 13, "-5" vira 5).
 *
 * `inteiros` limita os dígitos inteiros e `casas` as casas decimais (o excedente é cortado).
 */

const MILHAR = /^[1-9]\d{0,2}(\.\d{3})+$/

function soNumerico(valor: string): string {
  return valor.replace(/[^\d.,]/g, '')
}

/** Filtro por tecla: mantém dígitos, pontos (como digitados) e uma vírgula. Não converte nada. */
export function filtrarDecimal(valor: string, casas: number, inteiros = 9): string {
  const limpo = soNumerico(valor)
  const virgula = limpo.indexOf(',')
  if (virgula >= 0) {
    const inteira = limpo.slice(0, virgula).replace(/\./g, '').slice(0, inteiros)
    const fracao = limpo.slice(virgula + 1).replace(/[.,]/g, '').slice(0, casas)
    return `${inteira === '' ? '0' : inteira},${fracao}`
  }
  const comPonto = limpo.replace(/\.{2,}/g, '.')
  if (!comPonto.includes('.')) return comPonto.slice(0, inteiros)
  // Sem vírgula e com ponto: ainda não se sabe se é milhar ou decimal; só limita o total de dígitos.
  const [primeiro = '', ...resto] = comPonto.split('.')
  let digitos = Math.min(primeiro.length, inteiros)
  let saida = primeiro.slice(0, inteiros)
  const maximo = inteiros + casas
  for (const grupo of resto) {
    const cabe = Math.max(0, maximo - digitos)
    const parte = grupo.slice(0, cabe)
    saida += `.${parte}`
    digitos += parte.length
  }
  return saida
}

interface DecimalLido {
  inteira: string
  /** `null` quando não há parte decimal. */
  fracao: string | null
}

/** Decide o papel do ponto (ver regra no topo do arquivo). Não corta casas nem dígitos. */
function lerDecimal(valor: string): DecimalLido {
  const limpo = soNumerico(valor)
  const virgula = limpo.indexOf(',')
  if (virgula >= 0) {
    return {
      inteira: limpo.slice(0, virgula).replace(/\./g, ''),
      fracao: limpo.slice(virgula + 1).replace(/[.,]/g, ''),
    }
  }
  if (MILHAR.test(limpo)) return { inteira: limpo.replace(/\./g, ''), fracao: null }
  const ponto = limpo.indexOf('.')
  if (ponto < 0) return { inteira: limpo, fracao: null }
  return { inteira: limpo.slice(0, ponto), fracao: limpo.slice(ponto + 1).replace(/\./g, '') }
}

/**
 * Forma final do texto (blur): "1.000" -> "1000", "12.5" -> "12,5", "1.234,5" -> "1234,5",
 * "0,001" -> "0,001". Vírgula sem casas ("12,") perde a vírgula; vazio continua vazio.
 */
export function normalizarDecimal(valor: string, casas: number, inteiros = 9): string {
  const { inteira, fracao } = lerDecimal(valor)
  const parteInteira = inteira.slice(0, inteiros)
  const parteFracao = (fracao ?? '').slice(0, casas)
  if (parteFracao === '') return parteInteira
  return `${parteInteira === '' ? '0' : parteInteira},${parteFracao}`
}

/** Mesmo que `filtrarDecimal` (nome antigo, usado como `:mascara`). */
export const mascararDecimal = filtrarDecimal

/**
 * "2,5" -> 2500 (escala 3); "1.000" -> 1000000 (mil), "12.5" -> 12500. Vazio, inválido (letras, sinal)
 * ou com casas a mais devolve null.
 */
export function textoParaEscala(texto: string, casas: number): number | null {
  const t = texto.trim()
  if (!/^[\d.,]+$/.test(t)) return null
  const { inteira, fracao } = lerDecimal(t)
  if (inteira === '' && (fracao ?? '') === '') return null
  if ((fracao ?? '').length > casas) return null
  const numero = Number((inteira === '' ? '0' : inteira) + (fracao ?? '').padEnd(casas, '0'))
  return Number.isSafeInteger(numero) ? numero : null
}
