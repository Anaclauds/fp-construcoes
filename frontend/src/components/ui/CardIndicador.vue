<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  titulo: string
  valor: number | string
  descricao: string
  /** Classe global de cor de status (ver classeStatus); sem ela o card não mostra o ponto colorido. */
  classeCor?: string
}>()

// A fonte do valor encolhe conforme o número de caracteres para caber na largura do cartão (ver CSS).
const caracteres = computed(() => Math.max(String(props.valor).length, 1))
</script>

<template>
  <article
    class="card-indicador"
    :class="classeCor"
  >
    <h3 class="card-indicador-titulo">
      <span
        v-if="classeCor"
        class="card-indicador-ponto"
        aria-hidden="true"
      />
      {{ titulo }}
    </h3>
    <p
      class="card-indicador-valor"
      :style="{ '--ci-caracteres': caracteres }"
    >
      {{ valor }}
    </p>
    <p class="card-indicador-descricao">
      {{ descricao }}
    </p>
  </article>
</template>

<style scoped>
.card-indicador {
  min-width: 0;
  /* O cartão é o contêiner: o tamanho da fonte do valor depende da largura dele, não da janela. */
  container-type: inline-size;

  padding: 21px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
}

.card-indicador-titulo {
  display: flex;
  align-items: center;
  gap: 8px;

  margin: 0;
  color: #4a5565;
  font-size: 14px;
  font-weight: 500;
}

.card-indicador-ponto {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--st-texto);
}

.card-indicador-valor {
  margin: 6px 0 2px;
  color: var(--fp-verde);
  /* 36px (Figma) quando cabe; valores longos ("R$ 5.052.615,72") encolhem até 18px em vez de quebrar a linha. */
  font-size: clamp(18px, calc(100cqi / (var(--ci-caracteres, 1) * 0.64)), 36px);
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.2;
}

.card-indicador-descricao {
  margin: 0;
  color: #6a7282;
  font-size: 12px;
}
</style>
