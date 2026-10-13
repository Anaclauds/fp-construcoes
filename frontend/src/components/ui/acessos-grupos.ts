import { gruposMenu } from '../sidebar/menu'
import type { ModuloSistema } from '../../types'

export interface ModuloAcesso {
  modulo: ModuloSistema
  rotulo: string
}

export interface GrupoAcesso {
  id: string
  rotulo: string
  modulos: ModuloAcesso[]
}

// Itens do menu que dividem o mesmo módulo da API viram uma única linha.
const ROTULOS_COMPARTILHADOS: Partial<Record<ModuloSistema, string>> = {
  FREQUENCIA: 'Frequência e Relatório',
}

/** Módulos da API agrupados como o menu lateral (itens sem módulo ficam de fora). */
export const gruposAcesso: GrupoAcesso[] = gruposMenu
  .map((grupo) => {
    const modulos: ModuloAcesso[] = []
    for (const item of grupo.itens) {
      if (!item.modulo || modulos.some((m) => m.modulo === item.modulo)) continue
      const compartilhado = grupo.itens.filter((i) => i.modulo === item.modulo).length > 1
      modulos.push({
        modulo: item.modulo,
        rotulo: (compartilhado && ROTULOS_COMPARTILHADOS[item.modulo]) || item.rotulo,
      })
    }
    return { id: grupo.id, rotulo: grupo.rotulo, modulos }
  })
  .filter((grupo) => grupo.modulos.length > 0)
