<script setup lang="ts">
import CabecalhoPagina from '../ui/CabecalhoPagina.vue'
import SeletorData from '../ui/SeletorData.vue'
import FrequenciaIndicadores from './FrequenciaIndicadores.vue'
import type { Indicadores } from '../../types'

defineProps<{
  titulo: string
  subtitulo: string
  indicadores: Indicadores
}>()

// Dia exibido (YYYY-MM-DD); quem usa decide como trocá-lo (ex.: navegar mudando a query).
const data = defineModel<string>('data', { required: true })
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      :titulo="titulo"
      :subtitulo="subtitulo"
    >
      <template #acao>
        <SeletorData
          :model-value="data"
          @update:model-value="(nova) => (data = nova)"
        />
      </template>
    </CabecalhoPagina>

    <FrequenciaIndicadores :indicadores="indicadores" />

    <p class="aviso">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9.5"
        />
        <path d="M12 11v5.5M12 7.5h.01" />
      </svg>
      <span><slot name="aviso" /></span>
    </p>

    <slot />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 20px;
}

/* O título ganha respiro até os cards (Figma: ~66px entre o subtítulo e o primeiro bloco). */
.pagina > :first-child {
  margin-bottom: 20px;
}

.aviso {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  margin: 0;
  padding: 12px 17px;
  border: 1px solid var(--fp-verde-20);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);

  color: var(--fp-verde);
  font-size: 13px;
  line-height: 1.45;
}

.aviso svg {
  flex-shrink: 0;
  margin-top: 2px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}
</style>
