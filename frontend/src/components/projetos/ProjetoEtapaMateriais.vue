<script setup lang="ts">
import type { ErrosLinhaMaterial, LinhaMaterialCliente } from '../../composables/useFormularioEtapaProjeto'
import { mascararDecimal } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{
  linhas: LinhaMaterialCliente[]
  erros: Record<number, ErrosLinhaMaterial>
}>()

const emit = defineEmits<{
  adicionar: []
  remover: [linha: LinhaMaterialCliente]
}>()

const mascararQuantidade = (valor: string) => mascararDecimal(valor, 3, 9)
</script>

<template>
  <section class="materiais">
    <h3 class="secao-titulo">
      Materiais utilizados do cliente:
    </h3>
    <p class="secao-apoio">
      Material fornecido pelo próprio cliente. Fica só no histórico da etapa e não altera o estoque.
    </p>

    <div
      v-for="(linha, indice) in linhas"
      :key="linha.uid"
      class="linha"
    >
      <CampoFormulario
        v-model="linha.nome"
        class="linha-nome"
        rotulo="Nome do material:"
        placeholder="Insira o nome do material..."
        autocomplete="off"
        :maxlength="180"
        :erro="erros[linha.uid]?.nome"
      />
      <CampoFormulario
        v-model="linha.quantidade"
        rotulo="Qtd.:"
        placeholder="0"
        autocomplete="off"
        inputmode="decimal"
        :mascara="mascararQuantidade"
        :erro="erros[linha.uid]?.quantidade"
      />
      <CampoFormulario
        v-model="linha.unidade"
        rotulo="Unidade de Medida:"
        placeholder="Ex.: sc, m³, un"
        autocomplete="off"
        :maxlength="50"
        :erro="erros[linha.uid]?.unidade"
      />
      <button
        type="button"
        class="linha-remover"
        :aria-label="`Remover material ${indice + 1}`"
        :disabled="linhas.length === 1 && linha.nome === '' && linha.quantidade === '' && linha.unidade === ''"
        @click="emit('remover', linha)"
      >
        Remover
      </button>
    </div>

    <div>
      <BotaoFp
        variante="secundario"
        tamanho="compacto"
        @click="emit('adicionar')"
      >
        + Adicionar Material
      </BotaoFp>
    </div>
  </section>
</template>

<style scoped>
.materiais {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.secao-apoio {
  margin: -6px 0 0;
  color: #6a7282;
  font-size: 12.5px;
}

/* Figma: nome (largo), quantidade e unidade na mesma linha. */
.linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px 170px auto;
  gap: 12px;
  align-items: start;
}

.linha-remover {
  margin-top: 28px;
  padding: 8px;
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

@media (max-width: 760px) {
  .linha {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .linha-nome {
    grid-column: 1 / -1;
  }

  .linha-remover {
    margin-top: 0;
    justify-self: start;
  }
}
</style>
