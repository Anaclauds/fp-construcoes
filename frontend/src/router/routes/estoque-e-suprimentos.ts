import type { RouteRecordRaw } from 'vue-router'

import EquipamentosView from '../../views/estoque-e-suprimentos/EquipamentosView.vue'
import MateriaisView from '../../views/estoque-e-suprimentos/MateriaisView.vue'
import EstoqueView from '../../views/estoque-e-suprimentos/EstoqueView.vue'
import FornecedoresView from '../../views/estoque-e-suprimentos/FornecedoresView.vue'

const estoqueESuprimentosRoutes: RouteRecordRaw[] = [
  {
    path: '/equipamentos',
    name: 'equipamentos',
    component: EquipamentosView,
    meta: { permissao: { modulo: 'EQUIPAMENTOS', acao: 'visualizar' } },
  },
  {
    path: '/materiais',
    name: 'materiais',
    component: MateriaisView,
    meta: { permissao: { modulo: 'MATERIAIS', acao: 'visualizar' } },
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
]

export default estoqueESuprimentosRoutes