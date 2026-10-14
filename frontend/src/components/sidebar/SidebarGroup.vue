<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import setaIcon from '../../assets/icons/menu-seta-baixo.svg'
import { itemPertenceARota, type GrupoMenu } from './menu'

const props = defineProps<{
  grupo: GrupoMenu
  sidebarExpandida: boolean
  aberto: boolean
  ativo: boolean
}>()

const emit = defineEmits<{
  alternar: [id: string]
}>()

const route = useRoute()
const idSubmenu = `submenu-${props.grupo.id}`
</script>

<template>
  <div class="sidebar-group">
    <button
      type="button"
      class="sidebar-item"
      :class="{ 'sidebar-item--ativo': ativo && !aberto }"
      :title="sidebarExpandida ? undefined : grupo.rotulo"
      :aria-label="sidebarExpandida ? undefined : grupo.rotulo"
      :aria-expanded="sidebarExpandida ? aberto : undefined"
      :aria-controls="sidebarExpandida ? idSubmenu : undefined"
      @click="emit('alternar', grupo.id)"
    >
      <span class="sidebar-icon-caixa">
        <img
          :src="grupo.icone"
          class="sidebar-icon"
          :class="{ 'sidebar-icon--espelhado': grupo.espelharIcone }"
          alt=""
        >
      </span>

      <template v-if="sidebarExpandida">
        <span class="sidebar-item-label">{{ grupo.rotulo }}</span>
        <!-- A imagem aponta para cima: fechado gira para a direita, aberto para baixo. -->
        <img
          :src="setaIcon"
          class="sidebar-chevron"
          :class="{ 'sidebar-chevron--aberto': aberto }"
          alt=""
          width="16"
          height="10"
        >
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
          :class="{ 'sidebar-submenu-link--ativo': itemPertenceARota(item, route.name) }"
          :aria-current="itemPertenceARota(item, route.name) ? 'page' : undefined"
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
  min-height: 48px;

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
  font-weight: 600;
  text-align: left;

  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sidebar-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-item:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.sidebar-item--ativo {
  background-color: rgba(255, 255, 255, 0.14);
}

.sidebar-icon-caixa {
  width: 36px;
  height: 36px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.sidebar-icon--espelhado {
  transform: scaleX(-1);
}

.sidebar-item-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-chevron {
  flex-shrink: 0;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.sidebar-chevron--aberto {
  transform: rotate(180deg);
}

.sidebar-submenu {
  list-style: none;
  margin: 0 0 4px;
  /* Alinha com o texto do grupo: padding 10 + ícone 36 + gap 8. */
  padding: 0 0 0 54px;
}

.sidebar-submenu-link {
  display: block;
  padding: 1px 8px;
  margin-left: -8px;
  border-radius: 8px;

  color: #fff;
  font-size: var(--sidebar-fonte);
  font-weight: 600;
  line-height: 1.3;
  text-decoration: none;
}

.sidebar-submenu-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.sidebar-submenu-link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 1px;
}

.sidebar-submenu-link--ativo {
  background-color: rgba(255, 255, 255, 0.16);
}
</style>
