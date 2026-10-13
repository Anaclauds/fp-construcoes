import { api } from './api'
import type { AlterarSenhaPayload, AuthUser, Funcionario, RespostaLogin } from '../types'

export async function entrar(login: string, senha: string): Promise<RespostaLogin> {
  const { data } = await api.post<RespostaLogin>('/auth/login', { login, senha })
  return data
}

export async function buscarUsuarioLogado(): Promise<AuthUser> {
  const { data } = await api.get<AuthUser>('/auth/me')
  return data
}

export async function buscarMeusDados(): Promise<Funcionario> {
  const { data } = await api.get<Funcionario>('/auth/profile')
  return data
}

export async function alterarSenha(payload: AlterarSenhaPayload): Promise<void> {
  await api.patch('/auth/password', payload)
}
