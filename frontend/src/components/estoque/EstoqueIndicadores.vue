<script setup lang="ts">
import { computed } from 'vue'
import type { IndicadoresEstoque } from '../../types/estoque'
import CardIndicador from '../ui/CardIndicador.vue'

const props = defineProps<{
  indicadores: IndicadoresEstoque | null
  /** Há busca ou categoria aplicada: os números valem só para o filtro atual. */
  filtrado?: boolean
}>()

const escopo = computed(() => (props.filtrado ? 'no filtro atual' : 'no estoque'))
</script>

<template>
  <section
    class="indicadores"
    aria-label="Indicadores do estoque"
  >
    <CardIndicador
      titulo="Materiais Cadastrados"
      :valor="indicadores?.materiaisCadastrados ?? '—'"
      :descricao="filtrado ? 'itens no filtro atual' : 'itens no sistema'"
    />
    <CardIndicador
      titulo="Com Reserva Ativa"
      :valor="indicadores?.comReservaAtiva ?? '—'"
      :descricao="`em projetos ${escopo}`"
      classe-cor="fp-status--meio-periodo"
    />
    <CardIndicador
      titulo="Sem Reserva"
      :valor="indicadores?.semReserva ?? '—'"
      :descricao="`sem reserva ${escopo}`"
      classe-cor="fp-status--nenhum"
    />
    <CardIndicador
      titulo="Disponíveis"
      :valor="indicadores?.disponiveis ?? '—'"
      :descricao="`com saldo livre ${escopo}`"
      classe-cor="fp-status--presente"
    />
    <CardIndicador
      titulo="Sem Saldo"
      :valor="indicadores?.semSaldo ?? '—'"
      :descricao="`saldo zerado ${escopo}`"
      classe-cor="fp-status--falta-nao-justificada"
    />
  </section>
</template>

<style scoped>
.indicadores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
}

/* Celular: contagens curtas, 2 por linha. */
@media (max-width: 575px) {
  .indicadores {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
}
</style>
