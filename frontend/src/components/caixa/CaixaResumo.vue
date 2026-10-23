<script setup lang="ts">
import { computed } from 'vue'
import type { ResumoCaixa } from '../../types/caixa'
import { formatarMoeda } from '../../utils/formatadores'

const props = defineProps<{
  resumo: ResumoCaixa
  /** Caixa fechado: o último cartão vira "Saldo final". */
  fechado: boolean
  /** Mostra o atalho para definir o valor inicial (caixa aberto e usuário com permissão de gerenciar). */
  podeAlterarInicial: boolean
}>()

defineEmits<{ 'alterar-inicial': [] }>()

/** Valor de 8 dígitos ou mais: o texto não cabe no tamanho normal do cartão. */
const longo = (valor: string | number) => formatarMoeda(valor).length > 16

const saldoNegativo = computed(() => Number(props.resumo.saldoAtual) < 0)
</script>

<template>
  <dl
    class="resumo"
    aria-label="Resumo do caixa"
  >
    <div class="resumo-item">
      <dt>Valor Inicial</dt>
      <dd
        :class="{ 'valor-longo': longo(resumo.valorInicial) }"
        :title="formatarMoeda(resumo.valorInicial)"
      >
        {{ formatarMoeda(resumo.valorInicial) }}
      </dd>
      <button
        v-if="podeAlterarInicial"
        type="button"
        class="resumo-link"
        :aria-label="Number(resumo.valorInicial) === 0 ? undefined : 'Alterar valor inicial'"
        @click="$emit('alterar-inicial')"
      >
        {{ Number(resumo.valorInicial) === 0 ? 'Definir valor inicial' : 'Alterar' }}
      </button>
    </div>
    <div class="resumo-item">
      <dt>Total Entradas</dt>
      <dd
        class="valor-entrada"
        :class="{ 'valor-longo': longo(resumo.totalEntradas) }"
        :title="formatarMoeda(resumo.totalEntradas)"
      >
        {{ formatarMoeda(resumo.totalEntradas) }}
      </dd>
    </div>
    <div class="resumo-item">
      <dt>Total Saídas</dt>
      <dd
        class="valor-saida"
        :class="{ 'valor-longo': longo(resumo.totalSaidas) }"
        :title="formatarMoeda(resumo.totalSaidas)"
      >
        {{ formatarMoeda(resumo.totalSaidas) }}
      </dd>
    </div>
    <div class="resumo-item">
      <dt>{{ fechado ? 'Saldo final' : 'Saldo atual' }}</dt>
      <dd
        class="valor-saldo"
        :class="{ 'valor-saida': saldoNegativo, 'valor-longo': longo(resumo.saldoAtual) }"
        :title="formatarMoeda(resumo.saldoAtual)"
      >
        {{ formatarMoeda(resumo.saldoAtual) }}
      </dd>
    </div>
  </dl>
</template>

<style scoped>
.resumo {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;

  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
}

.resumo-item {
  min-width: 0;
  padding: 14px 24px;
  /* Permite que o valor encolha conforme a largura do próprio cartão (ver .valor-longo). */
  container-type: inline-size;
}

.resumo-item + .resumo-item {
  border-left: 1px solid var(--fp-cinza-borda);
}

dt {
  color: #4a5565;
  font-size: 13px;
  font-weight: 500;
}

dd {
  margin: 2px 0 0;
  color: #333;
  font-size: clamp(18px, 1.7vw, 24px);
  font-weight: 600;
  line-height: 1.25;
  /* "R$" e o número nunca se separam em linhas: valor grande encolhe (ver .valor-longo) em vez de quebrar. */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Valores de 8 dígitos ou mais (R$ 9.999.999.999,99 tem 19 caracteres): a fonte acompanha a largura do cartão. */
.valor-longo {
  font-size: min(clamp(18px, 1.7vw, 24px), 8.6cqi);
}

.valor-entrada {
  color: #008236;
}

.valor-saldo {
  color: var(--fp-verde);
}

.valor-saida {
  color: var(--fp-vermelho-escuro);
}

.resumo-link {
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.resumo-link:focus-visible {
  outline: none;
  border-radius: 4px;
  box-shadow: var(--fp-foco);
}

@media (max-width: 900px) {
  .resumo {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .resumo-item:nth-child(3) {
    border-left: 0;
  }

  .resumo-item:nth-child(n + 3) {
    border-top: 1px solid var(--fp-cinza-borda);
  }
}

@media (max-width: 480px) {
  .resumo-item {
    padding: 12px 14px;
  }
}
</style>
