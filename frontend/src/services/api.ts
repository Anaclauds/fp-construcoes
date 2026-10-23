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

/** Erro de um campo, no 400 de validação do backend (`erros[]`). */
export interface ErroCampo {
  campo: string
  mensagem: string
}

interface CorpoErro {
  message?: string | string[]
  /** Código estável do backend (ex.: VALIDACAO, CPF_CNPJ_DUPLICADO, ESTOQUE_INSUFICIENTE). */
  codigo?: string
  /** Campo ao qual o erro de negócio se refere (ex.: cpfCnpj, valor). */
  campo?: string
  /** Dados extras do erro de negócio (ex.: { restante }, { maximo }, { materiais }). */
  detalhes?: Record<string, unknown>
  /** Erros de validação por campo (codigos VALIDACAO e CAMPO_NAO_ACEITO). */
  erros?: ErroCampo[]
  funcionariosPendentes?: number[]
  /** Falta de estoque ao iniciar projeto ou registrar extra (também vem em `detalhes.materiais`). */
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
  /** Código do backend; vazio em erro de rede ou resposta sem corpo no formato da API. */
  codigo: string
  /** Campo citado pelo erro de negócio; vazio quando não há. */
  campo: string
  detalhes: Record<string, unknown>
  /** Erros de validação por campo; vazio fora do 400 de validação. */
  erros: ErroCampo[]
  funcionariosPendentes: number[]
  /** Materiais sem saldo (do campo `materiais` ou de `detalhes.materiais`); vazio quando o erro não é de estoque. */
  materiais: MaterialSemSaldo[]
}

const MENSAGEM_LIMITE_TENTATIVAS = 'Muitas tentativas. Aguarde 1 minuto e tente novamente.'
const MENSAGEM_LIMITE_REQUISICOES = 'Muitas requisições. Aguarde um instante e tente novamente.'
const MENSAGEM_SERVIDOR = 'Erro no servidor. Tente novamente em instantes.'
const MENSAGEM_SEM_PERMISSAO = 'Você não tem permissão para esta operação.'
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

const erroVazio = { codigo: '', campo: '', detalhes: {}, erros: [], funcionariosPendentes: [], materiais: [] }

/** Normaliza o erro no formato do backend (message string ou string[], mais codigo, campo, detalhes e erros[]). */
export function extrairErro(erro: unknown): ErroApi {
  const padrao = 'Não foi possível concluir a operação. Tente novamente.'

  if (isAxiosError<CorpoErro>(erro)) {
    if (!erro.response) {
      return { ...erroVazio, mensagem: 'Sem conexão com o servidor.', status: null }
    }
    const status = erro.response.status
    const corpo = erro.response.data ?? {}
    // 429: o limite de tentativas (10 por minuto) é do login; nas demais rotas é limite geral de requisições.
    const ehLogin = erro.config?.url?.includes('/auth/login') ?? false
    const mensagem =
      status === 429
        ? ehLogin
          ? MENSAGEM_LIMITE_TENTATIVAS
          : MENSAGEM_LIMITE_REQUISICOES
        : status === 403
          ? MENSAGEM_SEM_PERMISSAO
          : status >= 500
            ? MENSAGEM_SERVIDOR
            : traduzirMensagem(corpo.message, padrao)
    const detalhes =
      corpo.detalhes && typeof corpo.detalhes === 'object' && !Array.isArray(corpo.detalhes) ? corpo.detalhes : {}
    const materiais = Array.isArray(corpo.materiais)
      ? corpo.materiais
      : Array.isArray(detalhes.materiais)
        ? (detalhes.materiais as MaterialSemSaldo[])
        : []
    return {
      mensagem,
      status,
      codigo: typeof corpo.codigo === 'string' ? corpo.codigo : '',
      campo: typeof corpo.campo === 'string' ? corpo.campo : '',
      detalhes,
      erros: Array.isArray(corpo.erros) ? corpo.erros : [],
      funcionariosPendentes: Array.isArray(corpo.funcionariosPendentes) ? corpo.funcionariosPendentes : [],
      materiais,
    }
  }

  return { ...erroVazio, mensagem: erro instanceof Error ? erro.message : padrao, status: null }
}

/**
 * Mensagem de cada campo recusado pelo backend, pelo nome do campo (ex.: `{ cpfCnpj: '...' }`, `'itens.0.quantidade'`).
 * Junta `erros[]` (validação) e `campo` (erro de negócio, com a mensagem geral); em campo repetido vale a primeira.
 */
export function errosPorCampo(erro: unknown): Record<string, string> {
  const { erros, campo, mensagem } = extrairErro(erro)
  const porCampo: Record<string, string> = {}
  for (const item of erros) porCampo[item.campo] ??= item.mensagem
  if (campo) porCampo[campo] ??= mensagem
  return porCampo
}

export function extrairMensagemErro(erro: unknown): string {
  return extrairErro(erro).mensagem
}
