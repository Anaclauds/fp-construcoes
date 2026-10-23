import { token } from './sessao'

export interface CacheSessao<T> {
  /** Devolve a mesma promessa para todos que pedirem enquanto o cache valer; falha não fica guardada. */
  obter: () => Promise<T>
  /** Descarta o que foi guardado (depois de cadastrar/editar o que a lista reflete). */
  invalidar: () => void
}

const VALIDADE_PADRAO_MS = 5 * 60_000

/**
 * Cache de módulo para listas de apoio (categorias, unidades, fornecedores ativos) que vários modais abrem em
 * sequência. Vale enquanto a sessão (token) for a mesma e por `validadeMs`, para refletir cadastros feitos por
 * outras pessoas ou por outras telas que não passam por aqui. Quem grava o dado chama `invalidar`.
 */
export function criarCacheSessao<T>(carregar: () => Promise<T>, validadeMs = VALIDADE_PADRAO_MS): CacheSessao<T> {
  let guardado: { promessa: Promise<T>; token: string | null; expiraEm: number } | null = null

  function obter(): Promise<T> {
    const agora = Date.now()
    if (guardado && guardado.token === token.value && guardado.expiraEm > agora) return guardado.promessa

    const promessa = carregar()
    const entrada = { promessa, token: token.value, expiraEm: agora + validadeMs }
    guardado = entrada
    // Falhou (sem permissão, API fora): a próxima tentativa consulta de novo em vez de repetir o erro.
    promessa.catch(() => {
      if (guardado === entrada) guardado = null
    })
    return promessa
  }

  function invalidar() {
    guardado = null
  }

  return { obter, invalidar }
}
