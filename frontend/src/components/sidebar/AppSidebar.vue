<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import barraLateralIcon from '../../assets/icons/barra-lateral.svg'
import SidebarGroup from './SidebarGroup.vue'
import { grupoDaRota, gruposMenu } from './menu'

// Fixo ate existir login; depois vem do usuario autenticado.
const usuario = { nome: 'Francisco Pereira', perfil: 'Administrador', iniciais: 'FP' }

const route = useRoute()

const sidebarExpandida = shallowRef(true)
const menuAberto = shallowRef<string | null>(null)

const grupoAtivo = computed(() => grupoDaRota(route.name))

// Ao navegar, abre o grupo da pagina atual.
watch(
  grupoAtivo,
  (id) => {
    if (id) menuAberto.value = id
  },
  { immediate: true },
)

function alternarSidebar() {
  sidebarExpandida.value = !sidebarExpandida.value
}

function alternarGrupo(id: string) {
  // Comprimida: o clique no icone expande e ja mostra o grupo escolhido.
  if (!sidebarExpandida.value) {
    sidebarExpandida.value = true
    menuAberto.value = id
    return
  }

  menuAberto.value = menuAberto.value === id ? null : id
}
</script>

<template>
  <aside
    class="sidebar"
    :class="{ 'sidebar--comprimida': !sidebarExpandida }"
  >
    <div class="sidebar-header">
      <RouterLink
        :to="{ name: 'home' }"
        class="sidebar-profile"
        title="Ir para o início"
      >
        <span class="profile-avatar">{{ usuario.iniciais }}</span>

        <span
          v-if="sidebarExpandida"
          class="profile-info"
        >
          <span class="profile-name">{{ usuario.nome }}</span>
          <span class="profile-role">{{ usuario.perfil }}</span>
        </span>
      </RouterLink>

      <button
        type="button"
        class="sidebar-toggle"
        :aria-label="sidebarExpandida ? 'Recolher menu lateral' : 'Expandir menu lateral'"
        :aria-expanded="sidebarExpandida"
        @click="alternarSidebar"
      >
        <img
          :src="barraLateralIcon"
          alt=""
        >
      </button>
    </div>

    <nav
      class="sidebar-nav"
      aria-label="Menu principal"
    >
      <SidebarGroup
        v-for="grupo in gruposMenu"
        :key="grupo.id"
        :grupo="grupo"
        :sidebar-expandida="sidebarExpandida"
        :aberto="menuAberto === grupo.id"
        :ativo="grupoAtivo === grupo.id"
        @alternar="alternarGrupo"
      />
    </nav>

    <div class="sidebar-footer">
      <!-- Sem rota ainda: Meus Dados e Sair dependem do login. -->
      <button
        type="button"
        class="sidebar-footer-item"
        :title="sidebarExpandida ? undefined : 'Meus Dados'"
        :aria-label="sidebarExpandida ? undefined : 'Meus Dados'"
      >
        <svg
          class="sidebar-footer-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="8"
            r="4"
          />
          <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <span v-if="sidebarExpandida">Meus Dados</span>
      </button>

      <button
        type="button"
        class="sidebar-footer-item"
        :title="sidebarExpandida ? undefined : 'Sair'"
        :aria-label="sidebarExpandida ? undefined : 'Sair'"
      >
        <svg
          class="sidebar-footer-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
          <path d="M10 17l-5-5 5-5" />
          <path d="M5 12h11" />
        </svg>
        <span v-if="sidebarExpandida">Sair</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 320px;
  height: 100vh;
  flex-shrink: 0;

  position: sticky;
  top: 0;

  display: flex;
  flex-direction: column;
  gap: 32px;

  overflow: hidden;

  background-color: #1a6647;
  color: white;

  padding: 16px 12px;

  transition: width 0.3s ease;
}

.sidebar--comprimida {
  width: 80px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sidebar--comprimida .sidebar-header {
  flex-direction: column-reverse;
  gap: 16px;
}

.sidebar-profile {
  min-width: 0;

  display: flex;
  align-items: center;
  gap: 12px;

  padding: 4px;
  border-radius: 10px;

  color: white;
  text-decoration: none;
}

.sidebar-profile:focus-visible,
.sidebar-toggle:focus-visible,
.sidebar-footer-item:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.profile-avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;
  background-color: white;
  color: #1a6647;
  font-weight: 600;
}

.profile-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.profile-name {
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-role {
  font-size: 14px;
  opacity: 0.85;
}

.sidebar-toggle {
  width: 40px;
  height: 40px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;

  cursor: pointer;
}

.sidebar-toggle:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-toggle img {
  width: 32px;
  height: 32px;
}

.sidebar-nav {
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 8px;

  overflow-y: auto;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 4px;

  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.sidebar-footer-item {
  width: 100%;

  display: flex;
  align-items: center;
  gap: 14px;

  padding: 10px 12px;
  border: 0;
  border-radius: 10px;
  background: none;

  color: white;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;

  cursor: pointer;
}

.sidebar-footer-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-footer-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 3px;

  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
