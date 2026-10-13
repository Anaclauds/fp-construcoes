<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppSidebar from './components/sidebar/AppSidebar.vue'
import ToastContainer from './components/ui/ToastContainer.vue'
import logoPequeno from './assets/images/logo-pequeno.png'

const route = useRoute()
const exibirSidebar = computed(() => !route.meta.publica)
</script>

<template>
  <!-- Rotas públicas (login) ocupam a tela inteira, sem sidebar. -->
  <RouterView v-if="!exibirSidebar" />

  <div
    v-else
    class="app-layout"
  >
    <AppSidebar />

    <main class="app-content">
      <RouterLink
        :to="{ name: 'home' }"
        class="app-logo"
        aria-label="FP Construções - ir para o início"
      >
        <img
          :src="logoPequeno"
          alt=""
          width="75"
          height="75"
        >
      </RouterLink>

      <RouterView />
    </main>
  </div>

  <ToastContainer />
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}

/* Conteúdo: 48px depois do menu (gap do Figma) e 32px de margem à direita. */
.app-content {
  flex: 1;
  min-width: 0;

  position: relative;
  display: flex;
  flex-direction: column;

  padding: 22px 32px 36px 48px;
  overflow-y: auto;
}

.app-logo {
  position: absolute;
  top: 15px;
  right: 25px;
  z-index: 1;

  /* Caixa de 83x62 do Figma; o PNG é quadrado com margem, então a imagem transborda na vertical. */
  width: 83px;
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.app-logo img {
  display: block;
  object-fit: contain;
}

.app-logo:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

@media (max-width: 1199px) {
  .app-content {
    padding-left: 32px;
  }
}
</style>
