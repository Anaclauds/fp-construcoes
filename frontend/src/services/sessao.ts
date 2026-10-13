import { shallowRef } from 'vue'
import type { AuthUser } from '../types'

const CHAVE_TOKEN = 'fp:token'
const CHAVE_USUARIO = 'fp:usuario'

function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: string | null) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch {
    // localStorage indisponível: a sessão vale só enquanto a aba estiver aberta.
  }
}

function lerUsuario(): AuthUser | null {
  const bruto = ler(CHAVE_USUARIO)
  if (!bruto) return null
  try {
    return JSON.parse(bruto) as AuthUser
  } catch {
    return null
  }
}

// Estado único da sessão, compartilhado por api.ts e useAuth.
export const token = shallowRef<string | null>(ler(CHAVE_TOKEN))
export const usuario = shallowRef<AuthUser | null>(lerUsuario())

export function salvarSessao(novoToken: string, novoUsuario: AuthUser) {
  token.value = novoToken
  usuario.value = novoUsuario
  gravar(CHAVE_TOKEN, novoToken)
  gravar(CHAVE_USUARIO, JSON.stringify(novoUsuario))
}

export function salvarUsuario(novoUsuario: AuthUser) {
  usuario.value = novoUsuario
  gravar(CHAVE_USUARIO, JSON.stringify(novoUsuario))
}

export function limparSessao() {
  token.value = null
  usuario.value = null
  gravar(CHAVE_TOKEN, null)
  gravar(CHAVE_USUARIO, null)
}
