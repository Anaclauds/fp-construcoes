<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

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
  <aside class="sidebar">
    <div class="sidebar-profile">
      <div class="profile-avatar">
        FP
      </div>

      <div>
        <p class="profile-name">Francisco Pereira</p>
        <span class="profile-role">Administrador</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        type="button"
        class="sidebar-item"
        @click="alternarMenu('gestaoPessoas')">
        Gestão de Pessoas
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
        Comercial e Vendas
      </button>

      <ul
        v-if="menuAberto === 'comercialVendas'"
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
        Projetos e Serviços
      </button>

      <ul
        v-if="menuAberto === 'projetosServicos'"
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
        Estoque e Suprimentos
      </button>

      <ul
        v-if="menuAberto === 'estoqueSuprimentos'"
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
        Financeiro
      </button>

      <ul
        v-if="menuAberto === 'financeiro'"
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

  display: flex;
  flex-direction: column;

  background-color: #1a6647;
  color: white;

  padding: 16px;
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

  text-align: left;
  font-size: 20px;
  font-weight: 600;

  cursor: pointer;
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
  padding-left: 32px;

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