import { createRouter, createWebHistory } from 'vue-router'
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



export default router