<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { GrupoMenu } from './menu'

const props = defineProps<{
  grupo: GrupoMenu
  sidebarExpandida: boolean
  aberto: boolean
  ativo: boolean
}>()

const emit = defineEmits<{
  alternar: [id: string]
}>()

const idSubmenu = `submenu-${props.grupo.id}`
</script>

<template>
  <div class="sidebar-group">
    <button
      type="button"
      class="sidebar-item"
      :class="{ 'sidebar-item--ativo': ativo }"
      :title="sidebarExpandida ? undefined : grupo.rotulo"
      :aria-label="sidebarExpandida ? undefined : grupo.rotulo"
      :aria-expanded="sidebarExpandida ? aberto : undefined"
      :aria-controls="sidebarExpandida ? idSubmenu : undefined"
      @click="emit('alternar', grupo.id)"
    >
      <img
        :src="grupo.icone"
        class="sidebar-icon"
        alt=""
      >

      <template v-if="sidebarExpandida">
        <span class="sidebar-item-label">{{ grupo.rotulo }}</span>
        <span
          class="sidebar-chevron"
          :class="{ 'sidebar-chevron--aberto': aberto }"
          aria-hidden="true"
        />
      </template>
    </button>

    <ul
      v-if="sidebarExpandida && aberto"
      :id="idSubmenu"
      class="sidebar-submenu"
    >
      <li
        v-for="item in grupo.itens"
        :key="item.rota"
      >
        <RouterLink
          :to="{ name: item.rota }"
          class="sidebar-submenu-link"
        >
          {{ item.rotulo }}
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.sidebar-item {
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: none;
  color: white;

  display: flex;
  align-items: center;
  gap: 14px;

  padding: 10px 12px;

  text-align: left;
  font-size: 18px;
  font-weight: 600;

  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-item:focus-visible {
  outline: 2px solid white;
  outline-offset: 2px;
}

.sidebar-item--ativo {
  background-color: rgba(255, 255, 255, 0.16);
}

.sidebar-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.sidebar-item-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-chevron {
  width: 8px;
  height: 8px;
  flex-shrink: 0;

  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;

  transform: rotate(45deg);
  transition: transform 0.2s ease;
}

.sidebar-chevron--aberto {
  transform: rotate(-135deg);
}

.sidebar-submenu {
  list-style: none;
  margin: 4px 0 8px;
  padding-left: 58px;

  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-submenu-link {
  display: block;
  padding: 4px 8px;
  border-radius: 6px;

  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  font-size: 16px;
}

.sidebar-submenu-link:hover {
  color: white;
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-submenu-link:focus-visible {
  outline: 2px solid white;
  outline-offset: 1px;
}

.sidebar-submenu-link.router-link-active {
  color: white;
  font-weight: 600;
  background-color: rgba(255, 255, 255, 0.12);
}
</style>
