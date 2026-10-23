<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import { useMenuMovel } from '../../composables/useMenuMovel'
import { haModalAberto } from '../../composables/usePilhaModais'
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
const consultaTelaMedia = window.matchMedia('(max-width: 1199px)')
const telaMedia = shallowRef(consultaTelaMedia.matches)
const sidebarExpandidaPreferida = shallowRef(!consultaTelaMedia.matches)
// Ao redimensionar a janela atravessando os 1200px, o menu acompanha: comprimido abaixo, expandido acima.
function aoMudarLarguraDaTela(evento: MediaQueryListEvent) {
  telaMedia.value = evento.matches
  sidebarExpandidaPreferida.value = !evento.matches
}
consultaTelaMedia.addEventListener('change', aoMudarLarguraDaTela)
// Em telas de celular o menu é uma gaveta: sempre com os rótulos, sem a versão só de ícones.
const { telaEstreita, menuMovelAberto, fecharMenuMovel } = useMenuMovel()
const sidebarExpandida = computed(() => telaEstreita.value || sidebarExpandidaPreferida.value)
// Tablet (768-1199px): expandido, o menu fica por cima do conteúdo e se comporta como a gaveta do celular.
const tabletExpandido = computed(() => telaMedia.value && !telaEstreita.value && sidebarExpandidaPreferida.value)
const gaveta = useTemplateRef<HTMLElement>('gaveta')
const botaoAlternar = useTemplateRef<HTMLButtonElement>('botaoAlternar')
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

  fecharMenuMovel()
  logout()
  await router.replace({ name: 'login' })
}

function alternarSidebar() {
  // No celular o botão fecha a gaveta; no computador recolhe/expande o menu.
  if (telaEstreita.value) fecharMenuMovel()
  else sidebarExpandidaPreferida.value = !sidebarExpandidaPreferida.value
}

function alternarGrupo(id: string) {
  // Comprimida: o clique no icone expande e ja mostra o grupo escolhido.
  if (!sidebarExpandida.value) {
    sidebarExpandidaPreferida.value = true
    menuAberto.value = id
    return
  }

  menuAberto.value = menuAberto.value === id ? null : id
}

// Gaveta (celular): fecha ao navegar, com Esc e ao clicar fora; o foco vai para dentro ao abrir e Tab não escapa dela.
watch(
  () => route.fullPath,
  () => {
    fecharMenuMovel()
    // Tablet (768-1199px): o menu expandido fica sobre o conteúdo; ao navegar, volta a só ícones.
    if (consultaTelaMedia.matches && !telaEstreita.value) sidebarExpandidaPreferida.value = false
  },
)

function aoClicarNoMenu(evento: MouseEvent) {
  // Clicar no link da tela em que já está não muda a rota: a gaveta fecha mesmo assim.
  if (menuMovelAberto.value && evento.target instanceof Element && evento.target.closest('a')) fecharMenuMovel()
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') {
    fecharMenuMovel()
    return
  }
  if (evento.key !== 'Tab' || !gaveta.value) return
  const focaveis = Array.from(
    gaveta.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
  ).filter((elemento) => elemento.offsetParent !== null)
  const primeiro = focaveis[0]
  const ultimo = focaveis[focaveis.length - 1]
  if (!primeiro || !ultimo) return
  const ativo = document.activeElement
  if (evento.shiftKey && ativo === primeiro) {
    evento.preventDefault()
    ultimo.focus()
  } else if (!evento.shiftKey && ativo === ultimo) {
    evento.preventDefault()
    primeiro.focus()
  }
}

function fecharMenuTablet() {
  sidebarExpandidaPreferida.value = false
}

// Esc recolhe o menu expandido do tablet; com modal aberto, o Esc é do modal.
function aoTeclarTablet(evento: KeyboardEvent) {
  if (evento.key === 'Escape' && !haModalAberto.value) fecharMenuTablet()
}

watch(tabletExpandido, (expandido) => {
  if (expandido) window.addEventListener('keydown', aoTeclarTablet)
  else window.removeEventListener('keydown', aoTeclarTablet)
})

watch(menuMovelAberto, async (aberta) => {
  if (aberta) {
    window.addEventListener('keydown', aoTeclar)
    await nextTick()
    botaoAlternar.value?.focus()
  } else {
    window.removeEventListener('keydown', aoTeclar)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', aoTeclar)
  window.removeEventListener('keydown', aoTeclarTablet)
  consultaTelaMedia.removeEventListener('change', aoMudarLarguraDaTela)
})
</script>

<template>
  <!-- Fundo da gaveta (celular) e do menu expandido (tablet): clicar fora fecha. O Esc é tratado no teclado. -->
  <div
    v-if="menuMovelAberto || tabletExpandido"
    class="sidebar-fundo"
    :class="{ 'sidebar-fundo--tablet': !menuMovelAberto }"
    aria-hidden="true"
    @click="menuMovelAberto ? fecharMenuMovel() : fecharMenuTablet()"
  />

  <aside
    ref="gaveta"
    class="sidebar"
    :class="{ 'sidebar--comprimida': !sidebarExpandida, 'sidebar--movel-aberta': menuMovelAberto }"
    :inert="(telaEstreita && !menuMovelAberto) || haModalAberto"
    :role="telaEstreita ? 'dialog' : undefined"
    :aria-modal="telaEstreita && menuMovelAberto ? 'true' : undefined"
    :aria-label="telaEstreita ? 'Menu' : undefined"
    @click="aoClicarNoMenu"
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
        ref="botaoAlternar"
        type="button"
        class="sidebar-toggle"
        :aria-label="telaEstreita ? 'Fechar menu' : sidebarExpandida ? 'Recolher menu lateral' : 'Expandir menu lateral'"
        :aria-expanded="telaEstreita ? undefined : sidebarExpandida"
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

/* Celular (< 768px): o menu vira gaveta sobreposta, fechada por padrão; o fundo escurece o conteúdo. */
.sidebar-fundo {
  position: fixed;
  inset: 0;
  z-index: 1400;
  background-color: rgba(0, 0, 0, 0.45);
}

@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 1500;
    width: min(320px, 86vw);
    height: 100dvh;

    transform: translateX(-100%);
    visibility: hidden;
    transition:
      transform 0.25s ease,
      visibility 0s linear 0.25s;
  }

  .sidebar--movel-aberta {
    transform: none;
    visibility: visible;
    transition-delay: 0s;
  }

  .sidebar-nav {
    margin-top: 20px;
  }
}

/* Tablet (768-1199px): o menu sai do fluxo; comprimido ocupa a faixa de 68px (reservada em App.vue)
   e, expandido, abre por cima do conteúdo em vez de espremê-lo. */
@media (min-width: 768px) and (max-width: 1199px) {
  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    /* Abaixo dos modais (ModalBase usa 1600), inclusive os de confirmação/descarte. */
    z-index: 900;
    height: 100dvh;
  }

  .sidebar-fundo--tablet {
    z-index: 890;
  }

  .sidebar:not(.sidebar--comprimida) {
    box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
  }
}

@media (max-width: 767px) and (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
  }
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
