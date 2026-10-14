import type { RouteRecordRaw } from 'vue-router'

import EquipamentoNovoView from '../../views/estoque-e-suprimentos/EquipamentoNovoView.vue'
import EquipamentosView from '../../views/estoque-e-suprimentos/EquipamentosView.vue'
import EstoqueView from '../../views/estoque-e-suprimentos/EstoqueView.vue'
import FornecedorNovoView from '../../views/estoque-e-suprimentos/FornecedorNovoView.vue'
import FornecedoresView from '../../views/estoque-e-suprimentos/FornecedoresView.vue'
import MaterialNovoView from '../../views/estoque-e-suprimentos/MaterialNovoView.vue'
import MateriaisView from '../../views/estoque-e-suprimentos/MateriaisView.vue'

const estoqueESuprimentosRoutes: RouteRecordRaw[] = [
  {
    path: '/equipamentos',
    name: 'equipamentos',
    component: EquipamentosView,
    meta: { permissao: { modulo: 'EQUIPAMENTOS', acao: 'visualizar' } },
  },
  {
    path: '/equipamentos/novo',
    name: 'equipamentoNovo',
    component: EquipamentoNovoView,
    meta: { permissao: { modulo: 'EQUIPAMENTOS', acao: 'gerenciar' } },
  },
  {
    path: '/materiais',
    name: 'materiais',
    component: MateriaisView,
    meta: { permissao: { modulo: 'MATERIAIS', acao: 'visualizar' } },
  },
  {
    path: '/materiais/novo',
    name: 'materialNovo',
    component: MaterialNovoView,
    meta: { permissao: { modulo: 'MATERIAIS', acao: 'gerenciar' } },
  },
  {
    path: '/estoque',
    name: 'estoque',
    component: EstoqueView,
    meta: { permissao: { modulo: 'ESTOQUE', acao: 'visualizar' } },
  },
  {
    path: '/fornecedores',
    name: 'fornecedores',
    component: FornecedoresView,
    meta: { permissao: { modulo: 'FORNECEDORES', acao: 'visualizar' } },
  },
  {
    path: '/fornecedores/novo',
    name: 'fornecedorNovo',
    component: FornecedorNovoView,
    meta: { permissao: { modulo: 'FORNECEDORES', acao: 'gerenciar' } },
  },
]

export default estoqueESuprimentosRoutes
