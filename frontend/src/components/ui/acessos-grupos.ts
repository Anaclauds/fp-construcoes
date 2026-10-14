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
// Limitação: a API tem só o módulo FREQUENCIA; o Figma mostra "Frequência" e "Relatório de Frequência" como duas linhas.
const ROTULOS_COMPARTILHADOS: Partial<Record<ModuloSistema, string>> = {
  FREQUENCIA: 'Frequência e Relatório',
}

// Rótulos da tela de permissões do Figma que diferem dos do menu lateral.
const ROTULOS_PERMISSOES: Partial<Record<ModuloSistema, string>> = {
  DESPESAS: 'Despesas',
}

// Ordem do Figma (modais Visualizar/Editar Usuário) quando difere do menu: Material vem antes de Equipamento.
const ORDEM_PERMISSOES: ModuloSistema[] = ['MATERIAIS', 'EQUIPAMENTOS', 'ESTOQUE', 'FORNECEDORES']

function ordenar(modulos: ModuloAcesso[]): ModuloAcesso[] {
  const posicao = (m: ModuloAcesso) => ORDEM_PERMISSOES.indexOf(m.modulo)
  if (modulos.every((m) => posicao(m) < 0)) return modulos
  return [...modulos].sort((a, b) => posicao(a) - posicao(b))
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
        rotulo: (compartilhado && ROTULOS_COMPARTILHADOS[item.modulo]) || ROTULOS_PERMISSOES[item.modulo] || item.rotulo,
      })
    }
    return { id: grupo.id, rotulo: grupo.rotulo, modulos: ordenar(modulos) }
  })
  .filter((grupo) => grupo.modulos.length > 0)
