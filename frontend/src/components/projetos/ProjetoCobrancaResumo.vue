<script setup lang="ts">
import { computed } from 'vue'
import { centavosParaMoeda } from '../../utils/orcamentos'
import type { CobrancaCalculada } from '../../utils/projetos'
import ProjetoQuadroResumo, { type LinhaResumo } from './ProjetoQuadroResumo.vue'

const props = defineProps<{
  resultado: CobrancaCalculada
  parcelado: boolean
  /** A forma escolhida aceita acréscimo: só então a linha aparece (Figma: à vista tem apenas Subtotal, Desconto e Valor Final). */
  mostrarAcrescimo: boolean
  /** A quantidade de parcelas digitada é válida; sem isso o valor da parcela mostra "—". */
  parcelasValidas: boolean
}>()

const linhas = computed<LinhaResumo[]>(() => {
  const r = props.resultado
  const lista: LinhaResumo[] = [{ rotulo: 'Subtotal', valor: centavosParaMoeda(r.subtotal) }]
  if (props.mostrarAcrescimo) lista.push({ rotulo: 'Acréscimo (+)', valor: centavosParaMoeda(r.acrescimo) })
  lista.push({ rotulo: 'Desconto (-)', valor: centavosParaMoeda(r.desconto) })
  if (props.parcelado) {
    const mensal = props.parcelasValidas ? centavosParaMoeda(r.valorParcela) : '—'
    const ultima =
      props.parcelasValidas && r.valorUltimaParcela !== r.valorParcela
        ? ` (última: ${centavosParaMoeda(r.valorUltimaParcela)})`
        : ''
    lista.push({ rotulo: 'Valor Mensal da Parcela', valor: `${mensal}${ultima}` })
  }
  return lista
})
</script>

<template>
  <ProjetoQuadroResumo
    :linhas="linhas"
    :total="{ rotulo: 'Valor Final:', valor: centavosParaMoeda(resultado.final) }"
  />
</template>
