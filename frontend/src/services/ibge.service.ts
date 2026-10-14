interface MunicipioIbge {
  nome: string
}

const TEMPO_LIMITE_MS = 8000

// Lista de municípios por UF, guardada enquanto a aba estiver aberta (a lista quase não muda).
const cache = new Map<string, string[]>()

/**
 * Municípios de uma UF pela API pública do IBGE, em ordem alfabética.
 * Usa `fetch` nativo (e não a instância `api`) para o token da sessão nunca chegar a um terceiro.
 * Lança erro em falha de rede, timeout ou resposta inválida.
 */
export async function listarMunicipios(uf: string): Promise<string[]> {
  const sigla = uf.toUpperCase()
  const guardado = cache.get(sigla)
  if (guardado) return guardado

  const controle = new AbortController()
  const temporizador = window.setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)

  try {
    const resposta = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(sigla)}/municipios?orderBy=nome`,
      { signal: controle.signal, credentials: 'omit' },
    )
    if (!resposta.ok) throw new Error(`IBGE respondeu ${resposta.status}`)

    const dados = (await resposta.json()) as MunicipioIbge[]
    if (!Array.isArray(dados) || dados.length === 0) throw new Error('Resposta do IBGE sem municípios.')

    const nomes = dados.map((municipio) => municipio.nome)
    cache.set(sigla, nomes)
    return nomes
  } finally {
    window.clearTimeout(temporizador)
  }
}
