import { createRouter, createWebHistory } from 'vue-router'
import { registrarGuards } from './guards'
import LoginView from '../views/login/LoginView.vue'
import HomeView from '../views/home/HomeView.vue'
import comercialEVendasRoutes from './routes/comercial-e-vendas'
import projetosEServicosRoutes from './routes/projetos-e-servicos'
import gestaoDePessoasRoutes from './routes/gestao-de-pessoas'
import estoqueESuprimentosRoutes from './routes/estoque-e-suprimentos'
import financeiroRoutes from './routes/financeiro'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { publica: true },
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },

    ...comercialEVendasRoutes,
    ...projetosEServicosRoutes,
    ...gestaoDePessoasRoutes,
    ...estoqueESuprimentosRoutes,
    ...financeiroRoutes
  ],
})

registrarGuards(router)

export default router
