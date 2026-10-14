<script setup lang="ts">
import { computed } from 'vue'
import type { SaldoEstoque } from '../../types/estoque'
import { percentualDisponivel, quantidadeComUnidade, unidadeComSimbolo } from '../../utils/estoque'

/** Cartão "Resumo Atual" / "Estoque Atual": identificação do material, os três saldos e a barra de disponibilidade. */
const props = defineProps<{
  titulo: string
  nome: string
  categoria: string
  unidade: string
  saldo: SaldoEstoque
}>()

const percentual = computed(() => percentualDisponivel(props.saldo.quantidadeAtual, props.saldo.quantidadeDisponivel))
/** Quantidade de muitos dígitos ("999.999.999,999 m"): a fonte acompanha a largura do cartão em vez de quebrar a linha. */
const longa = (valor: string) => quantidadeComUnidade(valor, props.unidade).length > 10
const semSaldo = computed(() => Number(props.saldo.quantidadeDisponivel) <= 0)
</script>

<template>
  <section class="resumo">
    <h3 class="titulo">
      {{ titulo }}
    </h3>

    <dl class="identificacao">
      <div>
        <dt>Material:</dt>
        <dd>{{ nome }}</dd>
      </div>
      <div>
        <dt>Categoria:</dt>
        <dd>{{ categoria }}</dd>
      </div>
      <div>
        <dt>Unidade de Medida:</dt>
        <dd>{{ unidadeComSimbolo(unidade) }}</dd>
      </div>
    </dl>

    <dl class="numeros">
      <div class="numero">
        <dt>Estoque Atual</dt>
        <dd
          :class="{ 'valor-longo': longa(saldo.quantidadeAtual) }"
          :title="quantidadeComUnidade(saldo.quantidadeAtual, unidade)"
        >
          {{ quantidadeComUnidade(saldo.quantidadeAtual, unidade) }}
        </dd>
      </div>
      <div class="numero">
        <dt>Reservado</dt>
        <dd
          :class="{ 'valor-longo': longa(saldo.quantidadeReservada) }"
          :title="quantidadeComUnidade(saldo.quantidadeReservada, unidade)"
        >
          {{ quantidadeComUnidade(saldo.quantidadeReservada, unidade) }}
        </dd>
      </div>
      <div class="numero">
        <dt>Disponível</dt>
        <dd
          :class="{ 'sem-saldo': semSaldo, 'valor-longo': longa(saldo.quantidadeDisponivel) }"
          :title="quantidadeComUnidade(saldo.quantidadeDisponivel, unidade)"
        >
          {{ quantidadeComUnidade(saldo.quantidadeDisponivel, unidade) }}
        </dd>
      </div>
    </dl>

    <div class="disponibilidade">
      <div
        class="barra"
        role="img"
        :aria-label="`${percentual}% disponível`"
      >
        <div
          class="barra-preenchida"
          :class="{ 'barra-preenchida--zerada': semSaldo }"
          :style="{ width: `${percentual}%` }"
        />
      </div>
      <span class="percentual">{{ percentual }}% disponível</span>
    </div>
  </section>
</template>

<style scoped>
.resumo {
  padding: 16px 18px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.identificacao {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 0 14px;
  font-size: 13px;
}

.identificacao > div {
  display: flex;
  gap: 6px;
}

.identificacao dt {
  color: var(--fp-cinza-rotulo);
}

.identificacao dd {
  margin: 0;
  min-width: 0;
  color: #333;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.numeros {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0 0 12px;
}

.numero {
  padding: 10px 12px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 8px;
  background-color: #fff;
  text-align: center;
  container-type: inline-size;
}

.numero dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.numero dd {
  margin: 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.numero dd.valor-longo {
  font-size: min(18px, 8.4cqi);
}

.numero dd.sem-saldo {
  color: var(--fp-vermelho);
}

.disponibilidade {
  display: flex;
  align-items: center;
  gap: 12px;
}

.barra {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background-color: var(--fp-cinza-borda);
  overflow: hidden;
}

.barra-preenchida {
  height: 100%;
  border-radius: 999px;
  background-color: var(--fp-verde);
}

.barra-preenchida--zerada {
  background-color: var(--fp-vermelho);
}

.percentual {
  flex-shrink: 0;
  color: #4a5565;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 520px) {
  .numeros {
    grid-template-columns: 1fr;
  }
}
</style>
