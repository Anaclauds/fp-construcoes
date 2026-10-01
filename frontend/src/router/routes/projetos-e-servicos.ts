import type { RouteRecordRaw } from 'vue-router'

import ProjetosView from '../../views/projetos-e-servicos/ProjetosView.vue'
import ServicosView from '../../views/projetos-e-servicos/ServicosView.vue'

const projetosEServicosRoutes: RouteRecordRaw[] = [
  {
    path: '/projetos',
    name: 'projetos',
    component: ProjetosView,
  },
  {
    path: '/servicos',
    name: 'servicos',
    component: ServicosView,
  },
]

export default projetosEServicosRoutes