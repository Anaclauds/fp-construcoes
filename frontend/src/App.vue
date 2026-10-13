<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppSidebar from './components/sidebar/AppSidebar.vue'
</script>

<template>
  <div class="app-layout">
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