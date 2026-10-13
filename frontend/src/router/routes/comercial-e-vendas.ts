import type { RouteRecordRaw } from 'vue-router'

import ClientesView from '../../views/comercial-e-vendas/ClientesView.vue'
import ClienteNovoView from '../../views/comercial-e-vendas/ClienteNovoView.vue'
import OrcamentosView from '../../views/comercial-e-vendas/OrcamentosView.vue'
import OrcamentoNovoView from '../../views/comercial-e-vendas/OrcamentoNovoView.vue'
import CobrancasView from '../../views/comercial-e-vendas/CobrancasView.vue'

const comercialEVendasRoutes: RouteRecordRaw[] = [
  {
    path: '/clientes',
    name: 'clientes',
    component: ClientesView,
    meta: { permissao: { modulo: 'CLIENTES', acao: 'visualizar' } },
  },
  {
    path: '/clientes/novo',
    name: 'clienteNovo',
    component: ClienteNovoView,
    meta: { permissao: { modulo: 'CLIENTES', acao: 'gerenciar' } },
  },
  {
    path: '/orcamentos',
    name: 'orcamentos',
    component: OrcamentosView,
    meta: { permissao: { modulo: 'ORCAMENTOS', acao: 'visualizar' } },
  },
  {
    path: '/orcamentos/novo',
    name: 'orcamentoNovo',
    component: OrcamentoNovoView,
    meta: { permissao: { modulo: 'ORCAMENTOS', acao: 'gerenciar' } },
  },
  {
    path: '/cobrancas',
    name: 'cobrancas',
    component: CobrancasView,
    meta: { permissao: { modulo: 'COBRANCAS', acao: 'visualizar' } },
  },
]

export default comercialEVendasRoutes