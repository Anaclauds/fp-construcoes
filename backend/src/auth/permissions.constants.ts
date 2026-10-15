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
  grupo: string;
}> = [
  {
    valor: 'GESTAO_USUARIOS',
    rotulo: 'Gest\u00e3o de usu\u00e1rios',
    grupo: 'Gest\u00e3o de Pessoas',
  },
  {
    valor: 'GESTAO_FUNCIONARIOS',
    rotulo: 'Gest\u00e3o de funcion\u00e1rios',
    grupo: 'Gest\u00e3o de Pessoas',
  },
  {
    valor: 'FREQUENCIA',
    rotulo: 'Frequ\u00eancia',
    grupo: 'Gest\u00e3o de Pessoas',
  },
  { valor: 'CLIENTES', rotulo: 'Clientes', grupo: 'Comercial e Vendas' },
  {
    valor: 'ORCAMENTOS',
    rotulo: 'Or\u00e7amentos',
    grupo: 'Comercial e Vendas',
  },
  { valor: 'COBRANCAS', rotulo: 'Cobran\u00e7as', grupo: 'Comercial e Vendas' },
  { valor: 'PROJETOS', rotulo: 'Projetos', grupo: 'Projetos e Servi\u00e7os' },
  {
    valor: 'SERVICOS',
    rotulo: 'Servi\u00e7os',
    grupo: 'Projetos e Servi\u00e7os',
  },
  { valor: 'MATERIAIS', rotulo: 'Materiais', grupo: 'Estoque e Suprimentos' },
  { valor: 'ESTOQUE', rotulo: 'Estoque', grupo: 'Estoque e Suprimentos' },
  {
    valor: 'EQUIPAMENTOS',
    rotulo: 'Equipamentos',
    grupo: 'Estoque e Suprimentos',
  },
  {
    valor: 'FORNECEDORES',
    rotulo: 'Fornecedores',
    grupo: 'Estoque e Suprimentos',
  },
  { valor: 'DESPESAS', rotulo: 'Despesas', grupo: 'Financeiro' },
  { valor: 'CAIXA', rotulo: 'Caixa', grupo: 'Financeiro' },
];
