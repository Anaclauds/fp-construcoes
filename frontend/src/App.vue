<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import AppSidebar from './components/sidebar/AppSidebar.vue'
import { useMenuMovel } from './composables/useMenuMovel'
import ToastContainer from './components/ui/ToastContainer.vue'
import logoPequeno from './assets/images/logo-pequeno.png'

const route = useRoute()
const exibirSidebar = computed(() => !route.meta.publica)

// Celular: o menu é uma gaveta aberta por este botão; ao fechar, o foco volta para ele.
const { telaEstreita, menuMovelAberto, abrirMenuMovel } = useMenuMovel()
const botaoMenu = useTemplateRef<HTMLButtonElement>('botaoMenu')

watch(menuMovelAberto, async (aberta, estavaAberta) => {
  if (aberta || !estavaAberta) return
  await nextTick()
  botaoMenu.value?.focus()
})
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
      <!-- Na tela larga o logo fica solto no canto (position: absolute); no celular divide a barra do topo com o menu. -->
      <div class="app-topo">
        <button
          v-if="telaEstreita"
          ref="botaoMenu"
          type="button"
          class="app-menu-botao"
          aria-label="Abrir menu"
          aria-haspopup="dialog"
          :aria-expanded="menuMovelAberto"
          @click="abrirMenuMovel"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

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
      </div>

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

.app-topo {
  display: contents;
}

.app-menu-botao {
  width: 44px;
  height: 44px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;
  color: var(--fp-verde);
  cursor: pointer;
}

.app-menu-botao svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.app-menu-botao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

/* Tablet: o menu (68px comprimido) fica fixo; o conteúdo reserva essa faixa. */
@media (min-width: 768px) and (max-width: 1199px) {
  .app-layout {
    padding-left: 68px;
  }
}

@media (max-width: 1199px) {
  .app-content {
    padding-left: 32px;
  }
}

/* Celular: sem menu fixo ao lado, o conteúdo ocupa a largura toda com 16px de margem. */
@media (max-width: 767px) {
  .app-content {
    padding: 12px 16px 36px;
  }

  .app-topo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .app-logo {
    position: static;
    width: 64px;
    height: 48px;
  }

  .app-logo img {
    width: 56px;
    height: 56px;
  }
}
</style>
