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
  },
  {
    path: '/materiais',
    name: 'materiais',
    component: MateriaisView,
  },
  {
    path: '/estoque',
    name: 'estoque',
    component: EstoqueView,
  },
  {
    path: '/fornecedores',
    name: 'fornecedores',
    component: FornecedoresView,
  },
]

export default estoqueESuprimentosRoutes