import type { RouteRecordRaw } from 'vue-router'

import UsuariosView from '../../views/gestao-de-pessoas/UsuariosView.vue'
import UsuarioNovoView from '../../views/gestao-de-pessoas/UsuarioNovoView.vue'
import FuncionariosView from '../../views/gestao-de-pessoas/FuncionariosView.vue'
import FrequenciaView from '../../views/gestao-de-pessoas/FrequenciaView.vue'
import RelatorioFrequenciaView from '../../views/gestao-de-pessoas/RelatorioFrequenciaView.vue'

const gestaoDePessoasRoutes: RouteRecordRaw[] = [
  {
    path: '/usuarios',
    name: 'usuarios',
    component: UsuariosView,
    meta: { permissao: { modulo: 'GESTAO_USUARIOS', acao: 'visualizar' } },
  },
  {
    path: '/usuarios/novo',
    name: 'usuarioNovo',
    component: UsuarioNovoView,
    meta: { permissao: { modulo: 'GESTAO_USUARIOS', acao: 'gerenciar' } },
  },
  {
    path: '/funcionarios',
    name: 'funcionarios',
    component: FuncionariosView,
    meta: { permissao: { modulo: 'GESTAO_FUNCIONARIOS', acao: 'visualizar' } },
  },
  {
    path: '/frequencia',
    name: 'frequencia',
    component: FrequenciaView,
    meta: { permissao: { modulo: 'FREQUENCIA', acao: 'visualizar' } },
  },
  {
    path: '/relatorio-frequencia',
    name: 'relatorioFrequencia',
    component: RelatorioFrequenciaView,
    meta: { permissao: { modulo: 'FREQUENCIA', acao: 'visualizar' } },
  },
]

export default gestaoDePessoasRoutes
