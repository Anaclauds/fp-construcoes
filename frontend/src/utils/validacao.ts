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

/** Data real no formato DD/MM/AAAA (rejeita 31/02, ano < 1900 etc.). */
export function dataBrValida(valor: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor)
  if (!m) return false
  const [dia, mes, ano] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (ano < 1900) return false
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
}

/** True se a data DD/MM/AAAA (já validada) é posterior a hoje. */
export function dataBrNoFuturo(valor: string): boolean {
  const [dia, mes, ano] = valor.split('/').map(Number) as [number, number, number]
  const hoje = new Date()
  const ref = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  return Date.UTC(ano, mes - 1, dia) > ref
}

/** Telefone brasileiro: DDD + 8 ou 9 dígitos. */
export function telefoneValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  return (d.length === 10 || d.length === 11) && !d.startsWith('0')
}
