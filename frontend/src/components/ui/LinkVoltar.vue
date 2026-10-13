<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import voltarIcon from '../../assets/icons/icone-voltar.svg'

withDefaults(defineProps<{ para: RouteLocationRaw; texto?: string }>(), { texto: 'Voltar' })
</script>

<template>
  <RouterLink
    :to="para"
    class="link-voltar"
  >
    <img
      :src="voltarIcon"
      alt=""
      width="20"
      height="20"
    >
    {{ texto }}
  </RouterLink>
</template>

<style scoped>
.link-voltar {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  color: #666;
  font-size: 17px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 6px;
}

.link-voltar:hover {
  color: var(--fp-verde);
}

.link-voltar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}
</style>
