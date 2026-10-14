import type { RouteRecordRaw } from 'vue-router'

import ProjetosView from '../../views/projetos-e-servicos/ProjetosView.vue'
import ServicosView from '../../views/projetos-e-servicos/ServicosView.vue'
import ServicoNovoView from '../../views/projetos-e-servicos/ServicoNovoView.vue'

const projetosEServicosRoutes: RouteRecordRaw[] = [
  {
    path: '/projetos',
    name: 'projetos',
    component: ProjetosView,
    meta: { permissao: { modulo: 'PROJETOS', acao: 'visualizar' } },
  },
  {
    path: '/servicos',
    name: 'servicos',
    component: ServicosView,
    meta: { permissao: { modulo: 'SERVICOS', acao: 'visualizar' } },
  },
  {
    path: '/servicos/novo',
    name: 'servicoNovo',
    component: ServicoNovoView,
    meta: { permissao: { modulo: 'SERVICOS', acao: 'gerenciar' } },
  },
]

export default projetosEServicosRoutes