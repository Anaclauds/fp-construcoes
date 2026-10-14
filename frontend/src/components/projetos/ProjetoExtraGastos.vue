<script setup lang="ts">
import type { ErrosLinhaGasto, LinhaGastoAvulso } from '../../composables/useFormularioExtraProjeto'
import { mascararMoeda } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{
  linhas: LinhaGastoAvulso[]
  erros: Record<number, ErrosLinhaGasto>
}>()

const emit = defineEmits<{
  adicionar: []
  remover: [linha: LinhaGastoAvulso]
}>()
</script>

<template>
  <section class="itens">
    <h3 class="secao-titulo">
      Gastos Avulsos
    </h3>
    <p class="secao-apoio">
      Custos sem material ou serviço cadastrado (aluguel de equipamento, frete...). Entram na despesa do extra
      e na saída do caixa do mês do registro.
    </p>

    <article
      v-for="(linha, indice) in linhas"
      :key="linha.uid"
      class="linha"
    >
      <header class="linha-topo">
        <span class="linha-numero">Gasto {{ indice + 1 }}</span>
        <button
          type="button"
          class="linha-remover"
          :aria-label="`Remover gasto ${indice + 1}`"
          :disabled="linhas.length === 1 && linha.descricao === '' && linha.valor === ''"
          @click="emit('remover', linha)"
        >
          Remover
        </button>
      </header>

      <div class="linha-grade">
        <CampoFormulario
          v-model="linha.descricao"
          rotulo="Descrição:"
          placeholder="Ex: Aluguel de betoneira"
          autocomplete="off"
          :maxlength="255"
          :erro="erros[linha.uid]?.descricao"
        />
        <CampoFormulario
          v-model="linha.valor"
          rotulo="Valor (R$):"
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="erros[linha.uid]?.valor"
        />
      </div>
    </article>

    <div>
      <BotaoFp
        variante="secundario"
        tamanho="compacto"
        @click="emit('adicionar')"
      >
        + Adicionar gasto
      </BotaoFp>
    </div>
  </section>
</template>

<style scoped>
.itens {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.secao-apoio {
  margin: -8px 0 0;
  color: #6a7282;
  font-size: 12.5px;
}

.linha {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.linha-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.linha-numero {
  color: #4a5565;
  font-size: 13px;
  font-weight: 600;
}

.linha-remover {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--fp-vermelho);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.linha-remover:hover:not(:disabled) {
  text-decoration: underline;
}

.linha-remover:disabled {
  visibility: hidden;
}

.linha-remover:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.linha-grade {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 760px) {
  .linha-grade {
    grid-template-columns: 1fr;
  }
}
</style>
