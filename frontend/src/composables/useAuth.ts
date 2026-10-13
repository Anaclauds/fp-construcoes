import { computed, shallowRef } from 'vue'
import { buscarMeusDados, buscarUsuarioLogado, entrar } from '../services/auth.service'
import { limparSessao, salvarSessao, salvarUsuario, token, usuario } from '../services/sessao'
import type { AcaoPermissao, ModuloSistema } from '../types'

// Estado em escopo de módulo: todas as chamadas de useAuth() compartilham a mesma sessão.
const estaAutenticado = computed(() => token.value !== null)

const iniciais = computed(() => {
  const partes = (usuario.value?.nomeCompleto ?? '').split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  const primeira = partes[0]!.charAt(0)
  const ultima = partes.length > 1 ? partes[partes.length - 1]!.charAt(0) : ''
  return (primeira + ultima).toUpperCase()
})

// Função (cargo) do funcionário logado, vinda de /auth/profile; null enquanto não carregou ou se falhar.
const funcao = shallowRef<string | null>(null)
let funcaoDoFuncionarioId: number | null = null
let carregandoFuncao = false

/** Carrega a função uma vez por usuário logado; falhas são ignoradas (a tela usa o texto padrão). */
async function carregarFuncao() {
  const id = usuario.value?.funcionarioId ?? null
  if (id === null || id === funcaoDoFuncionarioId || carregandoFuncao) return

  carregandoFuncao = true
  try {
    const dados = await buscarMeusDados()
    // Se a sessão trocou durante a chamada, descarta a resposta.
    if (usuario.value?.funcionarioId === id) {
      funcao.value = dados.funcao || null
      funcaoDoFuncionarioId = id
    }
  } catch {
    // Sem a função o menu mostra "Usuário"; nova tentativa na próxima montagem do menu.
  } finally {
    carregandoFuncao = false
  }
}

async function login(cpf: string, senha: string) {
  const resposta = await entrar(cpf.replace(/\D/g, ''), senha)
  salvarSessao(resposta.accessToken, resposta.usuario)
}

function logout() {
  funcao.value = null
  funcaoDoFuncionarioId = null
  limparSessao()
}

async function carregarUsuario() {
  salvarUsuario(await buscarUsuarioLogado())
}

// Mesma regra do backend: gerenciar exige podeGerenciar; visualizar aceita qualquer um.
function temPermissao(modulo: ModuloSistema, acao: AcaoPermissao): boolean {
  const permissao = usuario.value?.permissoes.find((p) => p.modulo === modulo)
  if (!permissao) return false
  return acao === 'gerenciar'
    ? permissao.podeGerenciar
    : permissao.podeVisualizar || permissao.podeGerenciar
}

export function useAuth() {
  return { token, usuario, funcao, iniciais, estaAutenticado, login, logout, carregarUsuario, carregarFuncao, temPermissao }
}
