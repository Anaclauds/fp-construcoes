export const MODULOS_SISTEMA = [
  'GESTAO_USUARIOS',
  'GESTAO_FUNCIONARIOS',
  'FREQUENCIA',
  'CLIENTES',
  'ORCAMENTOS',
  'COBRANCAS',
  'PROJETOS',
  'SERVICOS',
  'MATERIAIS',
  'ESTOQUE',
  'EQUIPAMENTOS',
  'FORNECEDORES',
  'DESPESAS',
  'CAIXA',
] as const;

export type ModuloSistema = (typeof MODULOS_SISTEMA)[number];

export const MODULOS_SISTEMA_OPCOES: ReadonlyArray<{
  valor: ModuloSistema;
  rotulo: string;
}> = [
  { valor: 'GESTAO_USUARIOS', rotulo: 'Gestao de usuarios' },
  { valor: 'GESTAO_FUNCIONARIOS', rotulo: 'Gestao de funcionarios' },
  { valor: 'FREQUENCIA', rotulo: 'Frequencia' },
  { valor: 'CLIENTES', rotulo: 'Clientes' },
  { valor: 'ORCAMENTOS', rotulo: 'Orcamentos' },
  { valor: 'COBRANCAS', rotulo: 'Cobrancas' },
  { valor: 'PROJETOS', rotulo: 'Projetos' },
  { valor: 'SERVICOS', rotulo: 'Servicos' },
  { valor: 'MATERIAIS', rotulo: 'Materiais' },
  { valor: 'ESTOQUE', rotulo: 'Estoque' },
  { valor: 'EQUIPAMENTOS', rotulo: 'Equipamentos' },
  { valor: 'FORNECEDORES', rotulo: 'Fornecedores' },
  { valor: 'DESPESAS', rotulo: 'Despesas' },
  { valor: 'CAIXA', rotulo: 'Caixa' },
];
