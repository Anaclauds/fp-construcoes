import type { Router } from 'vue-router'
import { useAuth } from '../composables/useAuth'

export function registrarGuards(router: Router) {
  // Permissões podem ter mudado desde o último acesso: atualiza uma vez por carregamento da página.
  let usuarioAtualizado = false

  router.beforeEach(async (to) => {
    const auth = useAuth()

    if (to.meta.publica) {
      return auth.estaAutenticado.value && to.name === 'login' ? { name: 'home' } : true
    }

    if (!auth.estaAutenticado.value) {
      return {
        name: 'login',
        query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
      }
    }

    if (!usuarioAtualizado || !auth.usuario.value) {
      try {
        await auth.carregarUsuario()
        usuarioAtualizado = true
      } catch {
        // Sem conexão e com usuário em cache: segue com os dados salvos. Sem cache: refaz o login.
        if (!auth.usuario.value) {
          auth.logout()
          return { name: 'login', query: { redirect: to.fullPath } }
        }
      }
    }

    const exigida = to.meta.permissao
    if (exigida && !auth.temPermissao(exigida.modulo, exigida.acao)) {
      return { name: 'home' }
    }

    return true
  })
}
