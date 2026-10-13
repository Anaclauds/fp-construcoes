<script setup lang="ts">
defineProps<{
  /** "Material" ou "Serviço". */
  rotulo: string
  nome: string
  descricao?: string | null
  unidade: string
  quantidade: string
  valorUnitario: string
  total: string
}>()
</script>

<template>
  <article class="item">
    <p class="item-nome">
      <span class="item-rotulo">{{ rotulo }}:</span> {{ nome }}
    </p>
    <p
      v-if="descricao"
      class="item-linha"
    >
      <span class="item-rotulo">Descrição:</span> {{ descricao }}
    </p>
    <dl class="item-dados">
      <div>
        <dt>Unidade de Medida:</dt>
        <dd>{{ unidade }}</dd>
      </div>
      <div>
        <dt>Quantidade:</dt>
        <dd>{{ quantidade }}</dd>
      </div>
      <div>
        <dt>Valor Unit.:</dt>
        <dd>{{ valorUnitario }}</dd>
      </div>
      <div>
        <dt>Total:</dt>
        <dd class="item-total">
          {{ total }}
        </dd>
      </div>
    </dl>
  </article>
</template>

<style scoped>
/* Figma: cartão claro com o nome do item e, abaixo, unidade, quantidade, valor unitário e total. */
.item {
  padding: 14px 17px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.item-nome,
.item-linha {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.item-linha {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 500;
}

.item-rotulo {
  color: var(--fp-cinza-rotulo);
  font-weight: 500;
}

.item-dados {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 6px 16px;
  margin: 10px 0 0;
}

.item-dados dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

.item-dados dd {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
}

.item-total {
  color: var(--fp-verde);
}
</style>
