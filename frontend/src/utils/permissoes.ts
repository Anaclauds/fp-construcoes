import type { ModuloSistema, PermissaoPayload } from '../types'

export interface EstadoPermissao {
  podeVisualizar: boolean
  podeGerenciar: boolean
}

export type MapaPermissoes = Partial<Record<ModuloSistema, EstadoPermissao>>

/** Lista da API -> mapa por módulo. Gerenciar sempre implica visualizar. */
export function mapaDePermissoes(lista: PermissaoPayload[]): MapaPermissoes {
  const mapa: MapaPermissoes = {}
  for (const p of lista) {
    mapa[p.modulo] = {
      podeVisualizar: p.podeVisualizar || p.podeGerenciar,
      podeGerenciar: p.podeGerenciar,
    }
  }
  return mapa
}

/** Mapa -> payload da API; só módulos com algum acesso (a API substitui todas as permissões). */
export function permissoesParaPayload(mapa: MapaPermissoes): PermissaoPayload[] {
  return (Object.entries(mapa) as [ModuloSistema, EstadoPermissao][])
    .filter(([, estado]) => estado.podeVisualizar || estado.podeGerenciar)
    .map(([modulo, estado]) => ({
      modulo,
      podeVisualizar: estado.podeVisualizar || estado.podeGerenciar,
      podeGerenciar: estado.podeGerenciar,
    }))
}
