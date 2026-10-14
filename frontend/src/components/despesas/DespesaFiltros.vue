<script setup lang="ts">
import type { FiltroCategoriaDespesa, FiltroTipoDespesa } from '../../composables/useListaDespesas'
import { ROTULO_CATEGORIA_DESPESA } from '../../utils/despesas'
import type { CategoriaDespesa } from '../../types/despesa'
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

// Figma: Todas | Compra de Material | Combustível | Ferramenta | Manutenção | Alimentação | Outros; a API ainda tem Mão de Obra e Aluguel.
const ORDEM: CategoriaDespesa[] = [
  'COMPRA_MATERIAL',
  'COMBUSTIVEL',
  'FERRAMENTA',
  'MANUTENCAO',
  'ALIMENTACAO',
  'MAO_DE_OBRA',
  'ALUGUEL',
  'OUTROS',
]

const opcoesCategoria: OpcaoFiltro<FiltroCategoriaDespesa>[] = [
  { valor: 'TODAS', rotulo: 'Todas' },
  ...ORDEM.map((valor) => ({ valor, rotulo: ROTULO_CATEGORIA_DESPESA[valor] })),
]

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

/* Categoria tem 9 pílulas: não cabem ao lado da busca em telas médias, então descem juntas. */
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
