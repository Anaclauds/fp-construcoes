import axios, { isAxiosError } from 'axios'
import { useToast } from '../composables/useToast'
import { limparSessao, marcarSessaoExpirada, token } from './sessao'

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
    // Nestas rotas o 401 é erro do formulário (credencial errada), não sessão expirada.
    const ehErroDeCredencial =
      isAxiosError(erro) && ['/auth/login', '/auth/password'].some((rota) => erro.config?.url?.includes(rota))

    if (isAxiosError(erro) && erro.response?.status === 401 && !ehErroDeCredencial) {
      // Várias chamadas em andamento podem falhar juntas: só a primeira avisa e redireciona.
      const tinhaSessao = token.value !== null
      marcarSessaoExpirada()
      limparSessao()
      if (tinhaSessao) useToast().mostrarToast('Sua sessão expirou. Entre novamente.', 'erro')

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

const MENSAGEM_SERVIDOR = 'Erro no servidor. Tente novamente em instantes.'
const MENSAGEM_DADOS_INVALIDOS = 'Dados inválidos. Verifique os campos.'

// Mensagens padrão (em inglês) do class-validator, que não devem chegar ao usuário.
const PADRAO_VALIDATION_PIPE =
  /should not be empty|must be (longer|shorter) than|must be an? |must be one of|should not exist/i

/** Mantém as mensagens em português da API; as do ValidationPipe viram uma frase genérica. */
function traduzirMensagem(message: string | string[] | undefined, padrao: string): string {
  if (message === undefined || message === '') return padrao
  const lista = Array.isArray(message) ? message : [message]
  const portugues = lista.filter((m) => !PADRAO_VALIDATION_PIPE.test(m))
  return portugues.length > 0 ? portugues.join(' ') : MENSAGEM_DADOS_INVALIDOS
}

/** Normaliza o erro no formato do Nest (message string ou string[]). */
export function extrairErro(erro: unknown): ErroApi {
  const padrao = 'Não foi possível concluir a operação. Tente novamente.'

  if (isAxiosError<CorpoErro>(erro)) {
    if (!erro.response) {
      return { mensagem: 'Sem conexão com o servidor.', status: null, funcionariosPendentes: [] }
    }
    const status = erro.response.status
    const { message, funcionariosPendentes } = erro.response.data ?? {}
    return {
      mensagem: status >= 500 ? MENSAGEM_SERVIDOR : traduzirMensagem(message, padrao),
      status,
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
