<script setup lang="ts">
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'
import voltarIcon from '../../assets/icons/icone-voltar.svg'

// Com `custom` o RouterLink não repassa atributos ao <a>: a classe do pai é aplicada manualmente.
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    para: RouteLocationRaw
    texto?: string
    /**
     * Se a tela anterior do histórico é o próprio destino (ex.: a lista com busca, filtros e página na URL),
     * volta nela com `router.back()` em vez de abrir o destino "limpo".
     */
    voltarNoHistorico?: boolean
  }>(),
  { texto: 'Voltar', voltarNoHistorico: false },
)

const router = useRouter()

function aoClicar(evento: MouseEvent, navegar: (e?: MouseEvent) => Promise<unknown>) {
  if (props.voltarNoHistorico && !evento.ctrlKey && !evento.metaKey && !evento.shiftKey && evento.button === 0) {
    const anterior: unknown = window.history.state?.back
    const destino = router.resolve(props.para)
    if (typeof anterior === 'string' && anterior.split(/[?#]/)[0] === destino.path) {
      evento.preventDefault()
      router.back()
      return
    }
  }
  void navegar(evento)
}
</script>

<template>
  <RouterLink
    v-slot="{ href, navigate }"
    :to="para"
    custom
  >
    <a
      v-bind="$attrs"
      :href="href"
      class="link-voltar"
      @click="aoClicar($event, navigate)"
    >
      <img
        :src="voltarIcon"
        alt=""
        width="20"
        height="20"
      >
      {{ texto }}
    </a>
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
