<script setup lang="ts">
import { computed } from 'vue'
import type { StatusCobranca, StatusParcela, StatusProjetoCobranca } from '../../types'

type Situacao = 'aberto' | 'parcial' | 'pago' | 'vencido' | 'cancelado'

const props = defineProps<{
  status: StatusProjetoCobranca | StatusCobranca | StatusParcela
  /** Texto do selo; sem ele usa o nome padrão do status. */
  rotulo?: string
  /** Parcela em aberto/parcial já vencida (campo `vencida` da API): o selo vira "Vencida". */
  vencida?: boolean
}>()

const SITUACAO: Record<string, Situacao> = {
  EM_ABERTO: 'aberto',
  PARCIAL: 'parcial',
  PAGO: 'pago',
  PAGA: 'pago',
  VENCIDA: 'vencido',
  CANCELADO: 'cancelado',
  CANCELADA: 'cancelado',
}

const PADRAO: Record<string, string> = {
  EM_ABERTO: 'Em Aberto',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  PAGA: 'Paga',
  VENCIDA: 'Vencida',
  CANCELADO: 'Cancelado',
  CANCELADA: 'Cancelada',
}

const vencida = computed(() => props.vencida === true && (props.status === 'EM_ABERTO' || props.status === 'PARCIAL'))
const situacao = computed<Situacao>(() => (vencida.value ? 'vencido' : (SITUACAO[props.status] ?? 'aberto')))
</script>

<template>
  <span
    class="selo-status"
    :class="`selo-status--${situacao}`"
  >
    <span
      class="selo-status-ponto"
      aria-hidden="true"
    />
    {{ vencida ? PADRAO.VENCIDA : (rotulo ?? PADRAO[status]) }}
  </span>
</template>

<style scoped>
.selo-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 3px 12px;
  border: 1px solid;
  border-radius: 999px;

  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.selo-status-ponto {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.selo-status--aberto {
  background-color: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

.selo-status--parcial {
  background-color: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.selo-status--pago {
  background-color: #dcfce7;
  border-color: #86efac;
  color: #008236;
}

.selo-status--vencido {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.selo-status--cancelado {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #6b7280;
}
</style>
