import type { RouteLocationNormalized, Router } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'

const MENSAGEM_SEM_PERMISSAO = 'Você não tem permissão para acessar esta tela.'
// Voltar para a aba depois de mais que isso pede o /auth/me de novo (permissões podem ter mudado).
const ATUALIZAR_APOS_MS = 60_000

/** Destino do login: guarda a rota de origem, exceto o início (`?redirect=/` seria ruído). */
function paraLogin(to: RouteLocationNormalized) {
  return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
}

export function registrarGuards(router: Router) {
  // Permissões podem ter mudado desde o último acesso: atualiza uma vez por carregamento da página
  // e de novo quando a aba volta a ficar visível depois de um tempo.
  let usuarioAtualizado = false
  let ultimaAtualizacao = 0
  let atualizando = false

  router.beforeEach(async (to) => {
    const auth = useAuth()

    if (to.meta.publica) {
      return auth.estaAutenticado.value && to.name === 'login' ? { name: 'home' } : true
    }

    if (!auth.estaAutenticado.value) return paraLogin(to)

    if (!usuarioAtualizado || !auth.usuario.value) {
      try {
        await auth.carregarUsuario()
        usuarioAtualizado = true
        ultimaAtualizacao = Date.now()
      } catch {
        // Sem conexão e com usuário em cache: segue com os dados salvos. Sem cache: refaz o login.
        if (!auth.usuario.value) {
          auth.logout()
          return paraLogin(to)
        }
      }
    }

    const exigida = to.meta.permissao
    if (exigida && !auth.temPermissao(exigida.modulo, exigida.acao)) {
      useToast().mostrarToast(MENSAGEM_SEM_PERMISSAO, 'erro')
      return { name: 'home' }
    }

    return true
  })

  // Aba esquecida aberta: ao voltar, confere de novo as permissões e tira o usuário da tela que perdeu.
  document.addEventListener('visibilitychange', async () => {
    const auth = useAuth()
    if (document.visibilityState !== 'visible' || !auth.estaAutenticado.value || atualizando) return
    if (Date.now() - ultimaAtualizacao < ATUALIZAR_APOS_MS) return

    atualizando = true
    try {
      await auth.carregarUsuario()
      ultimaAtualizacao = Date.now()
    } catch {
      return // sem rede ou sessão expirada (o interceptor já trata o 401)
    } finally {
      atualizando = false
    }

    const exigida = router.currentRoute.value.meta.permissao
    if (exigida && !auth.temPermissao(exigida.modulo, exigida.acao)) {
      useToast().mostrarToast(MENSAGEM_SEM_PERMISSAO, 'erro')
      await router.replace({ name: 'home' })
    }
  })
}
