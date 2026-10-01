import type { RouteRecordRaw } from 'vue-router'

import UsuariosView from '../../views/gestao-de-pessoas/UsuariosView.vue'
import FuncionariosView from '../../views/gestao-de-pessoas/FuncionariosView.vue'
import FrequenciaView from '../../views/gestao-de-pessoas/FrequenciaView.vue'
import RelatorioFrequenciaView from '../../views/gestao-de-pessoas/RelatorioFrequenciaView.vue'

const gestaoDePessoasRoutes: RouteRecordRaw[] = [
  {
    path: '/usuarios',
    name: 'usuarios',
    component: UsuariosView,
  },
  {
    path: '/funcionarios',
    name: 'funcionarios',
    component: FuncionariosView,
  },
  {
    path: '/frequencia',
    name: 'frequencia',
    component: FrequenciaView,
  },
  {
    path: '/relatorio-frequencia',
    name: 'relatorioFrequencia',
    component: RelatorioFrequenciaView,
  },
]

export default gestaoDePessoasRoutes