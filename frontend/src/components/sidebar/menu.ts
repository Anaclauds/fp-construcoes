import gestaoPessoasIcon from '../../assets/icons/menu-gestao-pessoas.svg'
import comercialVendasIcon from '../../assets/icons/menu-comercial-vendas.svg'
import projetosServicosIcon from '../../assets/icons/menu-projetos-servicos.svg'
import estoqueSuprimentosIcon from '../../assets/icons/menu-estoque-suprimentos.svg'
import financeiroIcon from '../../assets/icons/menu-financeiro.svg'

import type { ModuloSistema } from '../../types'

export interface ItemMenu {
  rotulo: string
  rota: string
  /** Módulo exigido para ver o item; sem valor, o item é sempre exibido. */
  modulo?: ModuloSistema
  /** Rotas internas do item (ex.: página de cadastro) que mantêm o item ativo no menu. */
  rotasRelacionadas?: string[]
}

export interface GrupoMenu {
  id: string
  rotulo: string
  icone: string
  /** No Figma o ícone aparece espelhado na horizontal (rotate 180° + scaleY -1). */
  espelharIcone?: boolean
  itens: ItemMenu[]
}

export const gruposMenu: GrupoMenu[] = [
  {
    id: 'gestaoPessoas',
    rotulo: 'Gestão de Pessoas',
    icone: gestaoPessoasIcon,
    itens: [
      { rotulo: 'Usuário', rota: 'usuarios', modulo: 'GESTAO_USUARIOS', rotasRelacionadas: ['usuarioNovo'] },
      { rotulo: 'Funcionário', rota: 'funcionarios', modulo: 'GESTAO_FUNCIONARIOS', rotasRelacionadas: ['funcionarioNovo'] },
      { rotulo: 'Frequência', rota: 'frequencia', modulo: 'FREQUENCIA', rotasRelacionadas: ['frequenciaEditar'] },
      { rotulo: 'Relatório de Frequência', rota: 'relatorioFrequencia', modulo: 'FREQUENCIA' },
    ],
  },
  {
    id: 'comercialVendas',
    rotulo: 'Comercial e Vendas',
    icone: comercialVendasIcon,
    itens: [
      { rotulo: 'Cliente', rota: 'clientes', modulo: 'CLIENTES', rotasRelacionadas: ['clienteNovo'] },
      { rotulo: 'Orçamento', rota: 'orcamentos', modulo: 'ORCAMENTOS', rotasRelacionadas: ['orcamentoNovo'] },
      { rotulo: 'Cobrança', rota: 'cobrancas', modulo: 'COBRANCAS', rotasRelacionadas: ['cobrancaDetalhes'] },
    ],
  },
  {
    id: 'projetosServicos',
    rotulo: 'Projetos e Serviços',
    icone: projetosServicosIcon,
    espelharIcone: true,
    itens: [
      { rotulo: 'Projeto', rota: 'projetos', modulo: 'PROJETOS' },
      { rotulo: 'Serviço', rota: 'servicos', modulo: 'SERVICOS', rotasRelacionadas: ['servicoNovo'] },
    ],
  },
  {
    id: 'estoqueSuprimentos',
    rotulo: 'Estoque e Suprimentos',
    icone: estoqueSuprimentosIcon,
    itens: [
      { rotulo: 'Equipamento', rota: 'equipamentos', modulo: 'EQUIPAMENTOS', rotasRelacionadas: ['equipamentoNovo'] },
      { rotulo: 'Material', rota: 'materiais', modulo: 'MATERIAIS', rotasRelacionadas: ['materialNovo'] },
      { rotulo: 'Estoque', rota: 'estoque', modulo: 'ESTOQUE' },
      { rotulo: 'Fornecedor', rota: 'fornecedores', modulo: 'FORNECEDORES', rotasRelacionadas: ['fornecedorNovo'] },
    ],
  },
  {
    id: 'financeiro',
    rotulo: 'Financeiro',
    icone: financeiroIcon,
    itens: [
      { rotulo: 'Despesa', rota: 'despesas', modulo: 'DESPESAS' },
      { rotulo: 'Caixa', rota: 'caixa', modulo: 'CAIXA' },
    ],
  },
]

export function itemPertenceARota(item: ItemMenu, nomeRota: unknown): boolean {
  return typeof nomeRota === 'string' && (item.rota === nomeRota || !!item.rotasRelacionadas?.includes(nomeRota))
}

export function grupoDaRota(nomeRota: unknown): string | null {
  return gruposMenu.find((grupo) => grupo.itens.some((item) => itemPertenceARota(item, nomeRota)))?.id ?? null
}
