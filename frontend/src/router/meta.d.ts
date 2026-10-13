import 'vue-router'
import type { AcaoPermissao, ModuloSistema } from '../types'

declare module 'vue-router' {
  interface RouteMeta {
    /** Rota acessível sem login. */
    publica?: boolean
    /** Permissão mínima exigida para abrir a rota. */
    permissao?: { modulo: ModuloSistema; acao: AcaoPermissao }
  }
}
