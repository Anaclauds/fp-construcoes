import { hojeIso } from './datas'

export const TAMANHO_MINIMO_SENHA = 6

export interface ErrosSenha {
  senha?: string
  confirmarSenha?: string
}

/**
 * Valida senha + confirmação antes de enviar à API.
 * Com `obrigatoria: false` (edição), campos vazios são aceitos e nada é validado.
 */
export function validarSenhas(senha: string, confirmarSenha: string, obrigatoria: boolean): ErrosSenha {
  const erros: ErrosSenha = {}
  if (!obrigatoria && senha === '' && confirmarSenha === '') return erros

  if (senha === '') {
    erros.senha = 'Informe a senha.'
  } else if (senha.length < TAMANHO_MINIMO_SENHA) {
    erros.senha = `A senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`
  }

  if (confirmarSenha === '') {
    erros.confirmarSenha = 'Confirme a senha.'
  } else if (!erros.senha && senha !== confirmarSenha) {
    erros.confirmarSenha = 'As senhas não conferem.'
  }

  return erros
}

export interface ErrosAlterarSenha {
  senhaAtual?: string
  novaSenha?: string
  confirmarNovaSenha?: string
}

/** Valida o formulário "Alterar Senha": obrigatórios, mínimo de caracteres, confirmação igual e nova diferente da atual. */
export function validarAlterarSenha(senhaAtual: string, novaSenha: string, confirmarNovaSenha: string): ErrosAlterarSenha {
  const erros: ErrosAlterarSenha = {}

  if (senhaAtual === '') erros.senhaAtual = 'Informe a senha atual.'

  if (novaSenha === '') {
    erros.novaSenha = 'Informe a nova senha.'
  } else if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
    erros.novaSenha = `A nova senha deve ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`
  } else if (novaSenha === senhaAtual) {
    erros.novaSenha = 'A nova senha deve ser diferente da senha atual.'
  }

  if (confirmarNovaSenha === '') {
    erros.confirmarNovaSenha = 'Confirme a nova senha.'
  } else if (!erros.novaSenha && novaSenha !== confirmarNovaSenha) {
    erros.confirmarNovaSenha = 'As senhas não conferem.'
  }

  return erros
}

/** CPF com 11 dígitos, não repetidos, e dígitos verificadores corretos. */
export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false

  const digito = (base: string) => {
    const soma = [...base].reduce((acc, n, i) => acc + Number(n) * (base.length + 1 - i), 0)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }

  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10])
}

/** CNPJ com 14 dígitos, não repetidos, e dígitos verificadores corretos. */
export function cnpjValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false

  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const soma = [...base].reduce((acc, n, i) => acc + Number(n) * pesos[i]!, 0)
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  return digito(d.slice(0, 12)) === Number(d[12]) && digito(d.slice(0, 13)) === Number(d[13])
}

/** Data real no formato DD/MM/AAAA (rejeita 31/02 e ano < `anoMinimo`, padrão 1900; datas de obra usam 2000). */
export function dataBrValida(valor: string, anoMinimo = 1900): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor)
  if (!m) return false
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (ano < anoMinimo) return false
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

/** True se a data DD/MM/AAAA (já validada) é posterior a hoje. */
export function dataBrNoFuturo(valor: string): boolean {
  const [dia, mes, ano] = valor.split('/').map(Number) as [number, number, number]
  return Date.UTC(ano, mes - 1, dia) > hojeUtc()
}

export const IDADE_MINIMA_ANOS = 14

/** Soma anos a uma data DD/MM/AAAA (já validada) e devolve o instante em UTC; 29/02 vira 01/03 em ano não bissexto. */
function somarAnosBr(valor: string, anos: number): number {
  const [dia, mes, ano] = valor.split('/').map(Number) as [number, number, number]
  return Date.UTC(ano + anos, mes - 1, dia)
}

/** Meia-noite UTC do "hoje" do negócio (mesmo dia de `hojeIso`, fuso America/Porto_Velho, como o backend). */
function hojeUtc(): number {
  const [ano, mes, dia] = hojeIso().split('-').map(Number) as [number, number, number]
  return Date.UTC(ano, mes - 1, dia)
}

/** True se a pessoa nascida em `nascimento` (DD/MM/AAAA válida) ainda não fez 14 anos hoje. */
export function menorQueIdadeMinima(nascimento: string): boolean {
  return somarAnosBr(nascimento, IDADE_MINIMA_ANOS) > hojeUtc()
}

/** True se `contratacao` é anterior à data de `nascimento` (ambas DD/MM/AAAA válidas). */
export function anteriorAoNascimento(contratacao: string, nascimento: string): boolean {
  return somarAnosBr(contratacao, 0) < somarAnosBr(nascimento, 0)
}

/** True se `contratacao` é anterior ao 14º aniversário de `nascimento` (ambas DD/MM/AAAA válidas). */
export function antesDaIdadeMinima(contratacao: string, nascimento: string): boolean {
  return somarAnosBr(contratacao, 0) < somarAnosBr(nascimento, IDADE_MINIMA_ANOS)
}

/**
 * Telefone brasileiro: DDD + fixo de 8 dígitos (10 no total) ou celular de 9 dígitos (11 no total),
 * e o número do celular sempre começa com 9.
 */
export function telefoneValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  if (d.startsWith('0')) return false
  if (d.length === 10) return true
  return d.length === 11 && d[2] === '9'
}
