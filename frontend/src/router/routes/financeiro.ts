import type { RouteRecordRaw } from 'vue-router'

import DespesasView from '../../views/financeiro/DespesasView.vue'
import CaixaView from '../../views/financeiro/CaixaView.vue'

const financeiroRoutes: RouteRecordRaw[] = [
  {
    path: '/despesas',
    name: 'despesas',
    component: DespesasView,
  },
  {
    path: '/caixa',
    name: 'caixa',
    component: CaixaView,
  },
]

export default financeiroRoutes