<script setup lang="ts">
import type { Despesa } from '../../types/despesa'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import {
  despesaEstornada,
  nomeFornecedor,
  podeEditarDespesa,
  primeiraLinha,
  projetoDoExtra,
  resumoMateriais,
} from '../../utils/despesas'
import BotaoAcao from '../ui/BotaoAcao.vue'
import TabelaDados, { type ColunaTabela } from '../ui/TabelaDados.vue'
import SeloCategoriaDespesa from './SeloCategoriaDespesa.vue'

defineProps<{
  despesas: Despesa[]
  total: number
  porPagina: number
  carregando: boolean
  erro: string | null
  podeGerenciar: boolean
  /** Há filtros ativos (muda o texto de lista vazia). */
  filtrada: boolean
}>()

const emit = defineEmits<{
  visualizar: [despesa: Despesa]
  editar: [despesa: Despesa]
  'tentar-novamente': []
}>()

const pagina = defineModel<number>('pagina', { required: true })

const colunas: ColunaTabela[] = [
  { chave: 'data', rotulo: 'Data', largura: '11%' },
  { chave: 'categoria', rotulo: 'Categoria', largura: '20%' },
  { chave: 'descricao', rotulo: 'Descrição', largura: '39%' },
  { chave: 'valor', rotulo: 'Valor', largura: '16%', numerica: true },
  { chave: 'acoes', rotulo: 'Ações', largura: '14%' },
]

/** Segunda linha da descrição: o que foi comprado e de quem, ou a origem de uma despesa gerada por extra. */
function apoio(despesa: Despesa): string {
  const projeto = projetoDoExtra(despesa)
  // O backend só manda o id interno do projeto (não o número nem o título): sem ele, o texto fica genérico.
  if (projeto !== null) return 'Gerada por um extra de projeto'
  const materiais = resumoMateriais(despesa)
  const fornecedor = nomeFornecedor(despesa.fornecedor)
  return [materiais, fornecedor].filter(Boolean).join(' · ')
}
</script>

<template>
  <TabelaDados
    v-model:pagina="pagina"
    class="tabela-despesas"
    rotulo="Despesas"
    :colunas="colunas"
    :linhas="despesas"
    :chave-linha="(despesa: Despesa) => despesa.id"
    :total="total"
    :por-pagina="porPagina"
    :carregando="carregando"
    :erro="erro"
    :texto-vazio="filtrada ? 'Nenhuma despesa encontrada com esses filtros.' : 'Nenhuma despesa registrada.'"
    @tentar-novamente="emit('tentar-novamente')"
  >
    <template #celula-data="{ linha }">
      <span class="celula-principal">{{ isoParaDataBr(linha.data) }}</span>
    </template>
    <template #celula-categoria="{ linha }">
      <SeloCategoriaDespesa :categoria="linha.categoria" />
    </template>
    <template #celula-descricao="{ linha }">
      <span
        class="fp-celula-nome celula-bloco"
        :class="{ 'celula-estornada': despesaEstornada(linha) }"
      >
        {{ primeiraLinha(linha.descricao) }}
        <span
          v-if="despesaEstornada(linha)"
          class="tag-estornada"
        >Estornada</span>
      </span>
      <span
        v-if="apoio(linha)"
        class="celula-secundaria"
      >
        <svg
          v-if="linha.tipo === 'COMPRA_MATERIAL'"
          class="icone-caixa"
          viewBox="0 0 24 24"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
        {{ apoio(linha) }}
      </span>
    </template>
    <template #celula-valor="{ linha }">
      <span
        class="celula-principal celula-valor"
        :class="{ 'celula-estornada': despesaEstornada(linha) }"
      >{{ formatarMoeda(linha.valorTotal) }}</span>
    </template>
    <template #celula-acoes="{ linha }">
      <div class="acoes">
        <BotaoAcao
          tipo="visualizar"
          :alvo="`despesa de ${isoParaDataBr(linha.data)}`"
          @click="emit('visualizar', linha)"
        />
        <BotaoAcao
          v-if="podeGerenciar && podeEditarDespesa(linha)"
          tipo="editar"
          :alvo="`despesa de ${isoParaDataBr(linha.data)}`"
          @click="emit('editar', linha)"
        />
      </div>
    </template>
  </TabelaDados>
</template>

<style scoped>
.tabela-despesas {
  min-height: 460px;
}

/* Abaixo de ~760px de largura útil, rolagem horizontal em vez de espremer as colunas. */
.tabela-despesas :deep(table) {
  min-width: 760px;
}

.tabela-despesas :deep(td) {
  height: 64px;
}

.acoes {
  display: flex;
  gap: 6px;
}

.celula-bloco {
  display: block;
}

.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-valor {
  font-weight: 600;
}

/* Despesa estornada continua na lista, esmaecida e com o valor riscado. */
.celula-estornada {
  color: var(--fp-cinza-rotulo);
}

.celula-valor.celula-estornada {
  text-decoration: line-through;
}

.tag-estornada {
  margin-left: 6px;
  padding: 1px 8px;
  border: 1px solid #fca5a5;
  border-radius: 999px;
  background-color: #fef2f2;
  color: var(--fp-vermelho-escuro);
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}

.icone-caixa {
  margin-right: 3px;
  vertical-align: -1px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
</style>
