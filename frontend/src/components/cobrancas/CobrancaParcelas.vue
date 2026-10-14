<script setup lang="ts">
import type { Parcela } from '../../types'
import { restanteDaParcela } from '../../utils/cobrancas'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import SeloStatusCobranca from './SeloStatusCobranca.vue'

defineProps<{ parcelas: Parcela[] }>()
</script>

<template>
  <div class="parcelas">
    <table>
      <caption class="fp-sr-only">
        Parcelas da cobrança
      </caption>
      <thead>
        <tr>
          <th scope="col">
            Parcela
          </th>
          <th scope="col">
            Vencimento
          </th>
          <th
            scope="col"
            class="direita"
          >
            Valor
          </th>
          <th
            scope="col"
            class="direita"
          >
            Restante
          </th>
          <th scope="col">
            Status
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="parcela in parcelas"
          :key="parcela.id"
        >
          <td class="destaque">
            {{ parcela.numero }}ª
          </td>
          <td>{{ isoParaDataBr(parcela.vencimento) }}</td>
          <td class="direita">
            {{ formatarMoeda(parcela.valor) }}
          </td>
          <td class="direita">
            {{ formatarMoeda(restanteDaParcela(parcela)) }}
          </td>
          <td><SeloStatusCobranca :status="parcela.status" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.parcelas {
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  padding: 10px 14px;
  background-color: var(--fp-cinza-fundo);

  color: var(--fp-cinza-rotulo);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.27px;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  padding: 10px 14px;
  border-top: 1px solid var(--fp-cinza-borda);

  color: var(--fp-texto-corpo);
  font-size: 13px;
  white-space: nowrap;
}

.direita {
  text-align: right;
}

.destaque {
  color: var(--fp-verde);
  font-weight: 600;
}
</style>
