import type { RouteRecordRaw } from 'vue-router'

import DespesasView from '../../views/financeiro/DespesasView.vue'
import CaixaView from '../../views/financeiro/CaixaView.vue'

const financeiroRoutes: RouteRecordRaw[] = [
  {
    path: '/despesas',
    name: 'despesas',
    component: DespesasView,
    meta: { permissao: { modulo: 'DESPESAS', acao: 'visualizar' } },
  },
  {
    path: '/caixa',
    name: 'caixa',
    component: CaixaView,
    meta: { permissao: { modulo: 'CAIXA', acao: 'visualizar' } },
  },
]

export default financeiroRoutes