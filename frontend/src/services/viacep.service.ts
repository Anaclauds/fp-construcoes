export interface EnderecoViaCep {
  rua: string
  bairro: string
  cidade: string
  estado: string
}

interface RespostaViaCep {
  erro?: boolean | string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
}

const TEMPO_LIMITE_MS = 8000

/**
 * Consulta o ViaCEP. Usa `fetch` nativo e não a instância `api` (axios) de propósito:
 * assim o token da sessão nunca é enviado a um serviço de terceiros.
 * Devolve null quando o CEP não existe; lança erro em falha de rede ou resposta inválida.
 */
export async function consultarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digitos = cep.replace(/\D/g, '')
  const controle = new AbortController()
  const temporizador = window.setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controle.signal,
      credentials: 'omit',
    })
    if (!resposta.ok) throw new Error(`ViaCEP respondeu ${resposta.status}`)

    const dados = (await resposta.json()) as RespostaViaCep
    if (dados.erro) return null

    return {
      rua: dados.logradouro ?? '',
      bairro: dados.bairro ?? '',
      cidade: dados.localidade ?? '',
      estado: dados.uf ?? '',
    }
  } finally {
    window.clearTimeout(temporizador)
  }
}
