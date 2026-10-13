<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import gestaoPessoasIcon from '../assets/icons/gestao-pessoas.svg'
import comercialVendasIcon from '../assets/icons/comercial-vendas.svg'
import projetosServicosIcon from '../assets/icons/projetos-servicos.svg'
import estoqueSuprimentosIcon from '../assets/icons/estoque-suprimentos.svg'
import financeiroIcon from '../assets/icons/financeiro.svg'
import barraLateralIcon from '../assets/icons/barra-lateral.svg'

const route = useRoute()

const menuAberto = ref<string | null>(null)

const menuPorRota: Record<string, string> = {

  usuarios: 'gestaoPessoas',
  funcionarios: 'gestaoPessoas',
  frequencia: 'gestaoPessoas',
  relatorioFrequencia: 'gestaoPessoas',

  clientes: 'comercialVendas',
  orcamentos: 'comercialVendas',
  cobrancas: 'comercialVendas',
  
  projetos: 'projetosServicos',
  servicos: 'projetosServicos',

  materiais: 'estoqueSuprimentos',
  equipamentos: 'estoqueSuprimentos',
  estoque: 'estoqueSuprimentos',
  fornecedores: 'estoqueSuprimentos',

  despesas: 'financeiro',
  caixa: 'financeiro',

}

const sidebarExpandida = ref(true)

function alternarSidebar() {
  sidebarExpandida.value = !sidebarExpandida.value

  if (!sidebarExpandida.value) {
    menuAberto.value = null
  }
}

function obterMenuDaRota(nomeRota: unknown) {
  if (typeof nomeRota !== 'string') {
    return null
  }

  return menuPorRota[nomeRota] ?? null
}

watch(
  () => route.name,
  (nomeRota) => {
    menuAberto.value = obterMenuDaRota(nomeRota)
  },
  { immediate: true },
)

function alternarMenu(menu: string) {
  menuAberto.value = menuAberto.value === menu ? null : menu
}
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--comprimida': !sidebarExpandida }"
  >
    <button
      type="button"
      class="sidebar-toggle"
      @click="alternarSidebar"
      aria-label="Alternar menu lateral"
    >
      <img
        :src="barraLateralIcon"
        alt=""
      >
    </button>

    <div class="sidebar-profile">
      <div class="profile-avatar">
        FP
      </div>

      <div v-if="sidebarExpandida">
        <p class="profile-name">Francisco Pereira</p>
        <span class="profile-role">Administrador</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('gestaoPessoas')">
        <img
          :src="gestaoPessoasIcon"
          class="sidebar-icon"
          alt=""
        >

        <span v-if="sidebarExpandida">
          Gestão de Pessoas
        </span>
      </button>

      <ul
        v-if="menuAberto === 'gestaoPessoas'"
        class="sidebar-submenu">
        <li>
            <RouterLink :to="{ name: 'usuarios' }">
            Usuário
            </RouterLink>
        </li>

        <li>
            <RouterLink :to="{ name: 'funcionarios' }">
            Funcionário
            </RouterLink>
        </li>

        <li>
            <RouterLink :to="{ name: 'frequencia' }">
            Frequência
            </RouterLink>
        </li>

        <li>
            <RouterLink :to="{ name: 'relatorioFrequencia' }">
            Relatório de Frequência
            </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('comercialVendas')">
        <img
          :src="comercialVendasIcon"
          class="sidebar-icon"
          alt=""
        >
        <span v-if="sidebarExpandida">
          Comercial e Vendas
        </span>
      </button>

      <ul
        v-if="sidebarExpandida && menuAberto === 'comercialVendas'"
        class="sidebar-submenu">
        <li>
            <RouterLink :to="{ name: 'clientes' }">
                Cliente
            </RouterLink>
        </li>
        <li>    
            <RouterLink :to="{ name: 'orcamentos' }">
                Orçamento
            </RouterLink>
        </li>
        <li>    
            <RouterLink :to="{ name: 'cobrancas' }">
                Cobrança
            </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('projetosServicos')">
        <img
          :src="projetosServicosIcon"
          class="sidebar-icon"
          alt=""
        >
        <span v-if="sidebarExpandida">
          Projetos e Serviços
        </span>
      </button>

      <ul
        v-if="sidebarExpandida && menuAberto === 'projetosServicos'"
        class="sidebar-submenu">
        <li>
            <RouterLink :to="{ name: 'projetos' }">
                Projeto
            </RouterLink>
        </li>

        <li>
            <RouterLink :to="{ name: 'servicos' }">
                Serviço
            </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('estoqueSuprimentos')">
        <img
          :src="estoqueSuprimentosIcon"
          class="sidebar-icon"
          alt=""
        >
        <span v-if="sidebarExpandida">
          Estoque e Suprimentos
        </span>
      </button>

      <ul
        v-if="sidebarExpandida && menuAberto === 'estoqueSuprimentos'"
        class="sidebar-submenu">
        <li>
            <RouterLink :to="{ name: 'equipamentos' }">
                Equipamento
            </RouterLink>
        </li>
        <li>
            <RouterLink :to="{ name: 'materiais' }">
                Material
            </RouterLink>
        </li>

        <li>
            <RouterLink :to="{ name: 'estoque' }">
                Estoque
            </RouterLink>
        </li>
        <li>
            <RouterLink :to="{ name: 'fornecedores' }">
                Fornecedor
            </RouterLink>
        </li>
      </ul>

      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('financeiro')">
        <img
          :src="financeiroIcon"
          class="sidebar-icon"
          alt=""
        >
        <span v-if="sidebarExpandida">
          Financeiro
        </span>
      </button>

      <ul
        v-if="sidebarExpandida && menuAberto === 'financeiro'"
        class="sidebar-submenu">
        <li>
        <RouterLink :to="{ name: 'despesas' }">
            Despesa
        </RouterLink>
        </li>
        <li>
        <RouterLink :to="{ name: 'caixa' }">
            Caixa
        </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <a href="#">Meus Dados</a>
      <a href="#">Sair</a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 384px;
  min-height: 100vh;
  flex-shrink: 0;

  position: relative;

  display: flex;
  flex-direction: column;

  background-color: #1a6647;
  color: white;

  padding: 16px;

  transition: width 0.3s ease;
}

.sidebar--comprimida {
  width: 80px;
}

.sidebar--comprimida {
  width: 80px;
}

.sidebar--comprimida .sidebar-item {
  justify-content: center;
}

.sidebar--comprimida .sidebar-profile {
  justify-content: center;
}

.sidebar--comprimida .sidebar-nav {
  align-items: center;
}

.sidebar-toggle {
  position: absolute;
  top: 0;
  right: 6px;

  width: 45px;
  height: 45px;

  padding: 0;
  border: 0;
  background: transparent;

  cursor: pointer;
}

.sidebar-toggle img {
  width: 45px;
  height: 45px;
}

.sidebar-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-avatar {
  width: 42px;
  height: 42px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  background-color: white;
  color: #1a6647;
}

.profile-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.profile-role {
  font-size: 14px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 18px;

  margin-top: 120px;
}

.sidebar-item {
  border: 0;
  background: none;
  color: white;

  display: flex;
  align-items: center;
  gap: 14px;

  text-align: left;
  font-size: 20px;
  font-weight: 600;

  cursor: pointer;
}

.sidebar-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 18px;

  margin-top: auto;
}

.sidebar-footer a {
  color: white;
  text-decoration: none;
  font-size: 20px;
  font-weight: 600;
}

.sidebar-submenu {
  list-style: none;
  margin: 8px 0 0;
  padding-left: 56px;

  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sidebar-submenu li {
  font-size: 16px;
}

.sidebar-submenu a {
  color: white;
  text-decoration: none;
  font-size: 16px;
}

.sidebar-submenu a:hover {
  opacity: 0.8;
}

.sidebar-submenu a.router-link-active {
  font-weight: 600;
}
</style>