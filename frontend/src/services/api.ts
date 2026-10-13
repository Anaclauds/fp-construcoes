import axios, { isAxiosError } from 'axios'
import { limparSessao, token } from './sessao'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

const origemApi = new URL(import.meta.env.VITE_API_URL, window.location.origin).origin

api.interceptors.request.use((config) => {
  // Token só vai para a própria API, nunca para URL absoluta de outro host.
  const destino = new URL(config.url ?? '', new URL(config.baseURL ?? '', window.location.origin))
  if (token.value && destino.origin === origemApi) config.headers.Authorization = `Bearer ${token.value}`
  return config
})

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: unknown) => {
    const ehLogin = isAxiosError(erro) && erro.config?.url?.includes('/auth/login')

    if (isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      limparSessao()

      // Import dinâmico evita dependência circular com o router.
      const { default: router } = await import('../router')
      const atual = router.currentRoute.value
      // Sem nome = navegação inicial em curso; o guard do router já redireciona.
      if (atual.name && atual.name !== 'login') {
        await router.replace({
          name: 'login',
          query: atual.fullPath !== '/' ? { redirect: atual.fullPath } : undefined,
        })
      }
    }

    return Promise.reject(erro)
  },
)

interface CorpoErro {
  message?: string | string[]
  funcionariosPendentes?: number[]
}

export interface ErroApi {
  mensagem: string
  status: number | null
  funcionariosPendentes: number[]
}

/** Normaliza o erro no formato do Nest (message string ou string[]). */
export function extrairErro(erro: unknown): ErroApi {
  const padrao = 'Não foi possível concluir a operação. Tente novamente.'

  if (isAxiosError<CorpoErro>(erro)) {
    if (!erro.response) {
      return { mensagem: 'Sem conexão com o servidor.', status: null, funcionariosPendentes: [] }
    }
    const { message, funcionariosPendentes } = erro.response.data ?? {}
    const mensagem = Array.isArray(message) ? message.join(' ') : (message ?? padrao)
    return {
      mensagem,
      status: erro.response.status,
      funcionariosPendentes: funcionariosPendentes ?? [],
    }
  }

  return {
    mensagem: erro instanceof Error ? erro.message : padrao,
    status: null,
    funcionariosPendentes: [],
  }
}

export function extrairMensagemErro(erro: unknown): string {
  return extrairErro(erro).mensagem
}
