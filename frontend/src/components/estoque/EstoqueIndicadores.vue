<script setup lang="ts">
import type { IndicadoresEstoque } from '../../types/estoque'
import CardIndicador from '../ui/CardIndicador.vue'

defineProps<{ indicadores: IndicadoresEstoque | null }>()
</script>

<template>
  <section
    class="indicadores"
    aria-label="Indicadores do estoque"
  >
    <CardIndicador
      titulo="Materiais Cadastrados"
      :valor="indicadores?.materiaisCadastrados ?? '—'"
      descricao="itens no sistema"
    />
    <CardIndicador
      titulo="Com Reserva Ativa"
      :valor="indicadores?.comReservaAtiva ?? '—'"
      descricao="em projetos"
      classe-cor="fp-status--meio-periodo"
    />
    <CardIndicador
      titulo="Disponíveis"
      :valor="indicadores?.disponiveis ?? '—'"
      descricao="com saldo livre"
      classe-cor="fp-status--presente"
    />
  </section>
</template>

<style scoped>
.indicadores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

@media (max-width: 700px) {
  .indicadores {
    grid-template-columns: 1fr;
  }
}
</style>
