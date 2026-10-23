<script setup lang="ts">
import { computed } from 'vue'
import { useCategoriasDespesa } from '../../composables/useCategoriasDespesa'
import type { FiltroCategoriaDespesa, FiltroTipoDespesa } from '../../composables/useListaDespesas'
import { CATEGORIA_SEM_CATEGORIA } from '../../types/despesa'
import { ROTULO_SEM_CATEGORIA } from '../../utils/despesas'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../ui/CardBuscaFiltro.vue'
import GrupoChips from '../ui/GrupoChips.vue'

defineProps<{
  erroInicio?: string
  erroFim?: string
  temFiltros: boolean
}>()

defineEmits<{ limpar: [] }>()

const busca = defineModel<string>('busca', { required: true })
const categoria = defineModel<FiltroCategoriaDespesa>('categoria', { required: true })
const tipo = defineModel<FiltroTipoDespesa>('tipo', { required: true })
const dataInicio = defineModel<string>('dataInicio', { required: true })
const dataFim = defineModel<string>('dataFim', { required: true })

// As pílulas vêm do catálogo de categorias (inclui as cadastradas pelo usuário), mais "Sem categoria" para despesas legadas.
const { categorias } = useCategoriasDespesa()

const opcoesCategoria = computed<OpcaoFiltro<FiltroCategoriaDespesa>[]>(() => [
  { valor: 'TODAS', rotulo: 'Todas' },
  ...categorias.value.map((c) => ({ valor: c.nome, rotulo: c.rotulo })),
  { valor: CATEGORIA_SEM_CATEGORIA, rotulo: ROTULO_SEM_CATEGORIA },
])

const opcoesTipo: OpcaoFiltro<FiltroTipoDespesa>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'COMPRA_MATERIAL', rotulo: 'Compra' },
  { valor: 'DIVERSA', rotulo: 'Diversa' },
]
</script>

<template>
  <div class="filtros">
    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="categoria"
      class="filtros-busca"
      placeholder="Buscar por descrição, fornecedor ou material..."
      rotulo-filtro="Categoria:"
      :opcoes="opcoesCategoria"
    />

    <div class="filtros-periodo">
      <CampoData
        v-model="dataInicio"
        rotulo="Data Inicial:"
        :erro="erroInicio"
        :ano-minimo="2000"
      />
      <CampoData
        v-model="dataFim"
        rotulo="Data Final:"
        :erro="erroFim"
        :ano-minimo="2000"
      />
      <GrupoChips
        v-model="tipo"
        class="filtros-tipo"
        rotulo="Tipo:"
        :opcoes="opcoesTipo"
      />
      <BotaoFp
        v-if="temFiltros"
        class="filtros-limpar"
        variante="link"
        tamanho="pagina"
        @click="$emit('limpar')"
      >
        Limpar filtros
      </BotaoFp>
    </div>
  </div>
</template>

<style scoped>
.filtros {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Categoria tem muitas pílulas (o catálogo cresce): não cabem ao lado da busca, então descem juntas. */
.filtros-busca {
  flex-wrap: wrap;
}

.filtros-busca :deep(.card-busca-campo) {
  flex: 1 1 200px;
}

.filtros-busca :deep(.card-busca-filtros) {
  flex: 0 1 auto;
}

.filtros-periodo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 16px;
}

.filtros-periodo > :deep(.campo) {
  width: 190px;
}

.filtros-tipo {
  /* Alinha as pílulas ao campo de data (rótulo de 27px acima do input). */
  margin-top: 27px;
  height: 42px;
  align-items: center;
}

.filtros-limpar {
  margin-top: 27px;
  margin-left: auto;
}
</style>
