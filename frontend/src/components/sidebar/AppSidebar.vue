<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import barraLateralIcon from '../../assets/icons/menu-barra-lateral.svg'
import meusDadosIcon from '../../assets/icons/menu-meus-dados.svg'
import sairIcon from '../../assets/icons/menu-sair.svg'
import SidebarGroup from './SidebarGroup.vue'
import { rotuloLegivel } from '../../utils/formatadores'
import { grupoDaRota, gruposMenu } from './menu'

const route = useRoute()
const router = useRouter()
const { usuario, funcao, iniciais, logout, temPermissao, carregarFuncao } = useAuth()

// A função vem de /auth/profile (o /auth/me não traz); sem ela, mostra o texto padrão.
const funcaoUsuario = computed(() => rotuloLegivel(funcao.value) || 'Usuário')

onMounted(carregarFuncao)

// Esconde itens sem permissão de visualizar e grupos que ficam vazios.
const gruposVisiveis = computed(() =>
  gruposMenu
    .map((grupo) => ({
      ...grupo,
      itens: grupo.itens.filter((item) => !item.modulo || temPermissao(item.modulo, 'visualizar')),
    }))
    .filter((grupo) => grupo.itens.length > 0),
)

// Telas estreitas (< 1200px) começam com o menu comprimido, só com ícones.
const sidebarExpandida = shallowRef(!window.matchMedia('(max-width: 1199px)').matches)
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

async function sair() {
  // Sai da tela atual antes de deslogar: se ela barrar (alterações não salvas), a sessão continua.
  const falha = await router.replace({ name: 'home' })
  if (isNavigationFailure(falha, NavigationFailureType.aborted | NavigationFailureType.cancelled)) return

  logout()
  await router.replace({ name: 'login' })
}

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
        :title="sidebarExpandida ? 'Ir para o início' : `${usuario?.nomeCompleto ?? ''} - ir para o início`"
      >
        <span
          class="profile-avatar"
          aria-hidden="true"
        >{{ iniciais }}</span>

        <span
          v-if="sidebarExpandida"
          class="profile-info"
        >
          <span class="profile-name">{{ usuario?.nomeCompleto }}</span>
          <span class="profile-role">{{ funcaoUsuario }}</span>
        </span>
        <span
          v-else
          class="fp-sr-only"
        >{{ usuario?.nomeCompleto }}</span>
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
          width="45"
          height="45"
        >
      </button>
    </div>

    <nav
      class="sidebar-nav"
      aria-label="Menu principal"
    >
      <SidebarGroup
        v-for="grupo in gruposVisiveis"
        :key="grupo.id"
        :grupo="grupo"
        :sidebar-expandida="sidebarExpandida"
        :aberto="menuAberto === grupo.id"
        :ativo="grupoAtivo === grupo.id"
        @alternar="alternarGrupo"
      />
    </nav>

    <div class="sidebar-footer">
      <RouterLink
        :to="{ name: 'meusDados' }"
        class="sidebar-footer-item"
        :class="{ 'sidebar-footer-item--ativo': route.name === 'meusDados' }"
        :title="sidebarExpandida ? undefined : 'Meus Dados'"
        :aria-label="sidebarExpandida ? undefined : 'Meus Dados'"
      >
        <span class="sidebar-footer-icone">
          <img
            :src="meusDadosIcon"
            alt=""
            width="34"
            height="29"
          >
        </span>
        <span v-if="sidebarExpandida">Meus Dados</span>
      </RouterLink>

      <button
        type="button"
        class="sidebar-footer-item"
        :title="sidebarExpandida ? undefined : 'Sair'"
        :aria-label="sidebarExpandida ? undefined : 'Sair'"
        @click="sair"
      >
        <span class="sidebar-footer-icone">
          <img
            :src="sairIcon"
            class="sidebar-footer-icone--espelhado"
            alt=""
            width="34"
            height="34"
          >
        </span>
        <span v-if="sidebarExpandida">Sair</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* 384px no frame de 1632px; encolhe junto com a janela para não espremer o conteúdo. */
.sidebar {
  /* 23px em 1632px, 16px em 1280px, sem passar de 23px: os rótulos dos grupos cabem inteiros a partir de ~1200px. */
  --sidebar-fonte: clamp(14px, calc(2.27vw - 13px), 23px);

  width: clamp(300px, 23.53vw, 384px);
  height: 100vh;
  flex-shrink: 0;

  position: sticky;
  top: 0;

  display: flex;
  flex-direction: column;

  overflow: hidden;

  background-color: var(--fp-verde);
  color: #fff;

  padding: 16px 10px 14px;

  transition: width 0.3s ease;
}

.sidebar--comprimida {
  width: 68px;
}

.sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.sidebar--comprimida .sidebar-header {
  flex-direction: column-reverse;
  align-items: center;
  gap: 16px;
}

.sidebar-profile {
  min-width: 0;

  display: flex;
  align-items: center;
  gap: 8px;

  padding: 4px;
  border-radius: 10px;

  color: #fff;
  text-decoration: none;
}

.sidebar-profile:focus-visible,
.sidebar-toggle:focus-visible,
.sidebar-footer-item:focus-visible {
  outline: 2px solid #fff;
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
  background-color: #fff;
  color: rgba(0, 0, 0, 0.5);
  font-size: 20px;
  font-weight: 500;
}

.profile-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.profile-name {
  font-size: var(--sidebar-fonte);
  font-weight: 600;
  /* Nomes longos quebram em até 2 linhas em vez de ficar cortados. */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.profile-role {
  font-size: clamp(13px, 0.98vw, 16px);
  font-weight: 500;
  opacity: 0.7;
}

.sidebar-toggle {
  width: 45px;
  height: 45px;
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

.sidebar-nav {
  flex: 1;
  min-height: 0;

  display: flex;
  flex-direction: column;
  gap: 10px;

  /* Grupos começam em y≈215 no frame de 856px; em telas baixas o espaço encolhe. */
  margin-top: clamp(16px, 17vh, 146px);
  overflow-y: auto;
}

.sidebar-footer {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}

.sidebar-footer-item {
  width: 100%;

  display: flex;
  align-items: center;
  gap: 8px;

  padding: 6px 10px;
  border: 0;
  border-radius: 10px;
  background: none;

  color: #fff;
  font-family: inherit;
  font-size: var(--sidebar-fonte);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  cursor: pointer;
}

.sidebar-footer-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

/* Tela atual: mesmo destaque dos itens ativos do menu. */
.sidebar-footer-item--ativo,
.sidebar-footer-item--ativo:hover {
  background-color: rgba(255, 255, 255, 0.14);
}

.sidebar-footer-icone {
  width: 36px;
  height: 36px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;
}

/* No Figma o ícone de Sair aparece espelhado (seta para a direita, saindo). */
.sidebar-footer-icone--espelhado {
  transform: scaleX(-1);
}

.sidebar-footer-icone img {
  max-width: 100%;
  max-height: 100%;
}
</style>
