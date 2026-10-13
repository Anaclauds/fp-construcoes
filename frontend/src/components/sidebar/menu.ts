import gestaoPessoasIcon from '../../assets/icons/gestao-pessoas.svg'
import comercialVendasIcon from '../../assets/icons/comercial-vendas.svg'
import projetosServicosIcon from '../../assets/icons/projetos-servicos.svg'
import estoqueSuprimentosIcon from '../../assets/icons/estoque-suprimentos.svg'
import financeiroIcon from '../../assets/icons/financeiro.svg'

export interface ItemMenu {
  rotulo: string
  rota: string
}

export interface GrupoMenu {
  id: string
  rotulo: string
  icone: string
  itens: ItemMenu[]
}

export const gruposMenu: GrupoMenu[] = [
  {
    id: 'gestaoPessoas',
    rotulo: 'Gestão de Pessoas',
    icone: gestaoPessoasIcon,
    itens: [
      { rotulo: 'Usuário', rota: 'usuarios' },
      { rotulo: 'Funcionário', rota: 'funcionarios' },
      { rotulo: 'Frequência', rota: 'frequencia' },
      { rotulo: 'Relatório de Frequência', rota: 'relatorioFrequencia' },
    ],
  },
  {
    id: 'comercialVendas',
    rotulo: 'Comercial e Vendas',
    icone: comercialVendasIcon,
    itens: [
      { rotulo: 'Cliente', rota: 'clientes' },
      { rotulo: 'Orçamento', rota: 'orcamentos' },
      { rotulo: 'Cobrança', rota: 'cobrancas' },
    ],
  },
  {
    id: 'projetosServicos',
    rotulo: 'Projetos e Serviços',
    icone: projetosServicosIcon,
    itens: [
      { rotulo: 'Projeto', rota: 'projetos' },
      { rotulo: 'Serviço', rota: 'servicos' },
    ],
  },
  {
    id: 'estoqueSuprimentos',
    rotulo: 'Estoque e Suprimentos',
    icone: estoqueSuprimentosIcon,
    itens: [
      { rotulo: 'Equipamento', rota: 'equipamentos' },
      { rotulo: 'Material', rota: 'materiais' },
      { rotulo: 'Estoque', rota: 'estoque' },
      { rotulo: 'Fornecedor', rota: 'fornecedores' },
    ],
  },
  {
    id: 'financeiro',
    rotulo: 'Financeiro',
    icone: financeiroIcon,
    itens: [
      { rotulo: 'Despesa', rota: 'despesas' },
      { rotulo: 'Caixa', rota: 'caixa' },
    ],
  },
]

export function grupoDaRota(nomeRota: unknown): string | null {
  if (typeof nomeRota !== 'string') return null
  return gruposMenu.find((grupo) => grupo.itens.some((item) => item.rota === nomeRota))?.id ?? null
}
