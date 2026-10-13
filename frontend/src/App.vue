<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from './components/sidebar/AppSidebar.vue'

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
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  min-width: 0;
  padding: 24px 32px;
}
</style>
