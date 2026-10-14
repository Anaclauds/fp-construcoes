import axios, { isAxiosError } from 'axios'
import { useToast } from '../composables/useToast'
import { limparSessao, marcarSessaoExpirada, token } from './sessao'

// Sem .env, usa a API local padrão do backend (npm run start:dev).
const urlApi = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const api = axios.create({
  baseURL: urlApi,
})

const origemApi = new URL(urlApi, window.location.origin).origin

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
  /** Falta de estoque ao iniciar projeto ou registrar extra (backend atualizado). */
  materiais?: MaterialSemSaldo[]
}

export interface MaterialSemSaldo {
  id: number
  nome: string
  necessario: number
  disponivel: number
}

export interface ErroApi {
  mensagem: string
  status: number | null
  funcionariosPendentes: number[]
  /** Materiais sem saldo, quando o backend os detalha no 400 de estoque; vazio no backend antigo. */
  materiais: MaterialSemSaldo[]
}

const MENSAGEM_LIMITE_TENTATIVAS = 'Muitas tentativas. Aguarde 1 minuto e tente novamente.'
const MENSAGEM_LIMITE_REQUISICOES = 'Muitas requisições. Aguarde um instante e tente novamente.'
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
      return { mensagem: 'Sem conexão com o servidor.', status: null, funcionariosPendentes: [], materiais: [] }
    }
    const status = erro.response.status
    const { message, funcionariosPendentes, materiais } = erro.response.data ?? {}
    // 429: o limite de tentativas (10 por minuto) é do login; nas demais rotas é limite geral de requisições.
    const ehLogin = erro.config?.url?.includes('/auth/login') ?? false
    const mensagem =
      status === 429
        ? ehLogin
          ? MENSAGEM_LIMITE_TENTATIVAS
          : MENSAGEM_LIMITE_REQUISICOES
        : status >= 500
          ? MENSAGEM_SERVIDOR
          : traduzirMensagem(message, padrao)
    return {
      mensagem,
      status,
      funcionariosPendentes: funcionariosPendentes ?? [],
      materiais: Array.isArray(materiais) ? materiais : [],
    }
  }

  return {
    mensagem: erro instanceof Error ? erro.message : padrao,
    status: null,
    funcionariosPendentes: [],
    materiais: [],
  }
}

/**
 * Campos que o backend recusou por não existirem nele ("property X should not exist", do forbidNonWhitelisted).
 * Só o backend antigo responde assim a um campo novo: quem envia campos opcionais usa isto para reenviar no formato antigo.
 */
export function propriedadesNaoAceitas(erro: unknown): string[] {
  if (!isAxiosError<CorpoErro>(erro) || erro.response?.status !== 400) return []
  const message = erro.response.data?.message
  const lista = Array.isArray(message) ? message : message ? [message] : []
  return lista.flatMap((m) => {
    const achado = /property (\w+) should not exist/i.exec(m)
    return achado ? [achado[1]!] : []
  })
}

/** Mensagem original do 400 da API (sem tradução), para reconhecer que campo ela recusou. */
export function mensagemOriginal400(erro: unknown): string {
  if (!isAxiosError<CorpoErro>(erro) || erro.response?.status !== 400) return ''
  const message = erro.response.data?.message
  return Array.isArray(message) ? message.join(' ') : (message ?? '')
}

/** O endpoint ainda não existe neste backend (404 de rota, não de registro). */
export function endpointInexistente(erro: unknown): boolean {
  if (!isAxiosError<CorpoErro>(erro) || erro.response?.status !== 404) return false
  const message = erro.response.data?.message
  const texto = Array.isArray(message) ? message.join(' ') : (message ?? '')
  return /^cannot (get|post|patch|put|delete) /i.test(texto)
}

export function extrairMensagemErro(erro: unknown): string {
  return extrairErro(erro).mensagem
}
