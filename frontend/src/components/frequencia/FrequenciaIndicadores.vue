<script setup lang="ts">
import { computed } from 'vue'
import CardIndicador from '../ui/CardIndicador.vue'
import type { Indicadores } from '../../types'
import { classeStatus } from '../../utils/frequencia'

const props = defineProps<{ indicadores: Indicadores }>()

const faltas = computed(() => props.indicadores.faltasJustificadas + props.indicadores.faltasNaoJustificadas)
</script>

<template>
  <section
    class="indicadores"
    aria-label="Indicadores do dia"
  >
    <CardIndicador
      titulo="Frequências Não Registradas"
      :valor="indicadores.naoRegistrados"
      descricao="não registradas no dia"
    />
    <CardIndicador
      titulo="Presentes"
      :valor="indicadores.presentes"
      descricao="trabalharam normalmente"
      :classe-cor="classeStatus('PRESENTE')"
    />
    <CardIndicador
      titulo="Meio Período"
      :valor="indicadores.meioPeriodo"
      descricao="expediente parcial"
      :classe-cor="classeStatus('MEIO_PERIODO')"
    />
    <CardIndicador
      titulo="Faltas"
      :valor="faltas"
      :descricao="`${indicadores.faltasJustificadas} justif. · ${indicadores.faltasNaoJustificadas} não justif.`"
      :classe-cor="classeStatus('FALTA_NAO_JUSTIFICADA')"
    />
  </section>
</template>

<style scoped>
.indicadores {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1000px) {
  .indicadores {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
