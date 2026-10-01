import type { RouteRecordRaw } from 'vue-router'

import ClientesView from '../../views/comercial-e-vendas/ClientesView.vue'
import OrcamentosView from '../../views/comercial-e-vendas/OrcamentosView.vue'
import CobrancasView from '../../views/comercial-e-vendas/CobrancasView.vue'

const comercialEVendasRoutes: RouteRecordRaw[] = [
  {
    path: '/clientes',
    name: 'clientes',
    component: ClientesView,
  },
  {
    path: '/orcamentos',
    name: 'orcamentos',
    component: OrcamentosView,
  },
  {
    path: '/cobrancas',
    name: 'cobrancas',
    component: CobrancasView,
  },
]

export default comercialEVendasRoutes