<script setup lang="ts">
import { computed } from 'vue'
import type { Despesa } from '../../types/despesa'
import { formatarMoeda, formatarCnpj, isoParaDataBr } from '../../utils/formatadores'
import { formatarQuantidade } from '../../utils/estoque'
import { rotuloUnidade } from '../../utils/materiais'
import { nomeFornecedor, projetoDoExtra } from '../../utils/despesas'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import SeloCategoriaDespesa from './SeloCategoriaDespesa.vue'

const props = defineProps<{ despesa: Despesa }>()

const emit = defineEmits<{ fechar: [] }>()

const projetoExtra = computed(() => projetoDoExtra(props.despesa))
const registradoPor = computed(
  () => props.despesa.registradoPorUsuario?.funcionario?.nomeCompleto ?? props.despesa.registradoPorUsuario?.login ?? '',
)
const competencia = computed(() => {
  const [ano, mes] = props.despesa.data.slice(0, 10).split('-')
  return `${mes}/${ano}`
})
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes da Despesa"
    icone="olho"
    largura="560px"
    @fechar="emit('fechar')"
  >
    <div class="destaque">
      <span class="destaque-rotulo">Valor</span>
      <strong class="destaque-valor">{{ formatarMoeda(despesa.valorTotal) }}</strong>
    </div>

    <p
      v-if="projetoExtra !== null"
      class="aviso"
    >
      Despesa gerada pelo extra do projeto {{ projetoExtra }}. Ela acompanha o projeto e não pode ser editada aqui.
    </p>

    <dl class="linhas">
      <div class="linha">
        <dt>Data:</dt>
        <dd>{{ isoParaDataBr(despesa.data) }}</dd>
      </div>
      <div class="linha">
        <dt>Categoria:</dt>
        <dd><SeloCategoriaDespesa :categoria="despesa.categoria" /></dd>
      </div>
      <div class="linha linha--texto">
        <dt>Descrição:</dt>
        <dd class="texto-longo">
          {{ despesa.descricao }}
        </dd>
      </div>
      <div
        v-if="despesa.fornecedor"
        class="linha"
      >
        <dt>Fornecedor:</dt>
        <dd>
          {{ nomeFornecedor(despesa.fornecedor) }}
          <span class="apoio">{{ formatarCnpj(despesa.fornecedor.cnpj) }}</span>
        </dd>
      </div>
      <div
        v-if="registradoPor"
        class="linha"
      >
        <dt>Registrada por:</dt>
        <dd>{{ registradoPor }}</dd>
      </div>
    </dl>

    <section
      v-if="despesa.materiais.length > 0"
      class="materiais"
      aria-labelledby="despesa-materiais"
    >
      <h3
        id="despesa-materiais"
        class="secao-titulo"
      >
        Material Comprado
      </h3>
      <ul class="lista-materiais">
        <li
          v-for="item in despesa.materiais"
          :key="item.id"
          class="material"
        >
          <dl class="linhas">
            <div class="linha">
              <dt>Material:</dt>
              <dd>{{ item.material.nome }} <span class="apoio">{{ item.material.codigo }}</span></dd>
            </div>
            <div class="linha">
              <dt>Quantidade:</dt>
              <dd>{{ formatarQuantidade(item.quantidade) || item.quantidade }} {{ rotuloUnidade(item.unidadeMedida) }}</dd>
            </div>
            <div class="linha">
              <dt>Valor unitário:</dt>
              <dd>{{ formatarMoeda(item.valorUnitario) }}</dd>
            </div>
            <div class="linha">
              <dt>Total do item:</dt>
              <dd>{{ formatarMoeda(item.valorTotal) }}</dd>
            </div>
          </dl>
        </li>
      </ul>
    </section>

    <p class="nota">
      <template v-if="despesa.tipo === 'COMPRA_MATERIAL'">
        Esta compra deu entrada no estoque dos materiais acima e saiu do caixa de {{ competencia }}.
      </template>
      <template v-else>
        Esta despesa saiu do caixa de {{ competencia }}.
      </template>
    </p>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        @click="emit('fechar')"
      >
        Fechar
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.destaque {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0 16px;
}

.destaque-rotulo {
  color: var(--fp-cinza-rotulo);
  font-size: 13px;
  font-weight: 500;
}

.destaque-valor {
  color: var(--fp-verde);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.2;
}

.aviso {
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;
  color: #b45309;
  font-size: 13px;
}

.linhas {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid #f0f1f3;
}

.linha dt {
  flex-shrink: 0;
  color: var(--fp-cinza-rotulo);
  font-size: 13px;
  font-weight: 500;
}

.linha dd {
  margin: 0;
  min-width: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.texto-longo {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

/* Descrição pode ter várias linhas (ex.: despesa de extra de projeto): rótulo em cima e texto alinhado à esquerda. */
.linha--texto {
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}

.linha--texto dd {
  text-align: left;
  font-weight: 500;
}

.apoio {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11.5px;
  font-weight: 500;
}

.secao-titulo {
  margin: 20px 0 6px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.lista-materiais {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.material {
  padding: 2px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.material .linha:last-child {
  border-bottom: 0;
}

.nota {
  margin: 16px 0 0;
  color: #717182;
  font-size: 12.5px;
}
</style>
