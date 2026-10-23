<script setup lang="ts">
export interface LinhaResumo {
  rotulo: string
  valor: string
}

defineProps<{
  titulo?: string
  linhas: LinhaResumo[]
  /** Linha final em destaque, separada das demais (ex.: "Valor Total"). */
  total?: LinhaResumo
}>()
</script>

<template>
  <section class="quadro">
    <h3
      v-if="titulo"
      class="quadro-titulo"
    >
      {{ titulo }}
    </h3>
    <dl class="quadro-linhas">
      <div
        v-for="linha in linhas"
        :key="linha.rotulo"
        class="quadro-linha"
      >
        <dt>{{ linha.rotulo }}</dt>
        <dd>{{ linha.valor || '—' }}</dd>
      </div>
      <div
        v-if="total"
        class="quadro-linha quadro-linha--total"
      >
        <dt>{{ total.rotulo }}</dt>
        <dd>{{ total.valor }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
/* Figma (Informações do Projeto / resumo da cobrança): cartão claro com rótulo à esquerda e valor à direita. */
.quadro {
  padding: 16px 21px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.quadro-titulo {
  margin: 0 0 12px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.quadro-linhas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.quadro-linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

dt {
  /* Rótulo longo quebra de linha em vez de empurrar o valor para fora do cartão. */
  flex: 0 1 auto;
  min-width: 0;
  max-width: 62%;
  color: #6a7282;
  font-size: 14px;
  font-weight: 400;
}

dd {
  flex: 1 1 auto;
  min-width: 8ch;
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.quadro-linha--total {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--fp-cinza-borda);
}

.quadro-linha--total dt {
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

.quadro-linha--total dd {
  color: var(--fp-verde);
  font-size: 20px;
  font-weight: 700;
}
</style>
