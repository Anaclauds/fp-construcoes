<script setup lang="ts">
import { onMounted } from 'vue'
import { useHistoricoCaixas } from '../../composables/useHistoricoCaixas'
import type { CaixaHistorico } from '../../types/caixa'
import { competenciaDoCaixa, rotuloCompetencia, situacaoDoCaixaHistorico } from '../../utils/caixa'
import { formatarMoeda } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import TabelaDados, { type ColunaTabela } from '../ui/TabelaDados.vue'
import SeloSituacaoCaixa from './SeloSituacaoCaixa.vue'

/** Histórico dos caixas existentes; escolher uma linha abre aquela competência. Monte com `v-if`. */
const emit = defineEmits<{ fechar: []; selecionar: [competencia: string] }>()

const historico = useHistoricoCaixas()

const colunas: ColunaTabela[] = [
  { chave: 'competencia', rotulo: 'Competência', largura: '20%' },
  { chave: 'situacao', rotulo: 'Situação', largura: '22%' },
  { chave: 'inicial', rotulo: 'Saldo inicial', largura: '15%', numerica: true },
  { chave: 'entradas', rotulo: 'Entradas', largura: '14%', numerica: true },
  { chave: 'saidas', rotulo: 'Saídas', largura: '14%', numerica: true },
  { chave: 'final', rotulo: 'Saldo final', largura: '15%', numerica: true },
]

function selecionar(caixa: CaixaHistorico) {
  emit('selecionar', competenciaDoCaixa(caixa))
}

onMounted(historico.carregar)
</script>

<template>
  <ModalBase
    aberto
    titulo="Histórico de Caixas"
    subtitulo="Escolha um mês para ver o caixa"
    icone="olho"
    largura="900px"
    @fechar="emit('fechar')"
  >
    <TabelaDados
      v-model:pagina="historico.pagina.value"
      class="tabela-historico"
      rotulo="Caixas existentes"
      :colunas="colunas"
      :linhas="historico.caixas.value"
      :chave-linha="(linha: CaixaHistorico) => linha.id"
      :total="historico.total.value"
      :por-pagina="historico.porPagina"
      :carregando="historico.carregando.value"
      :erro="historico.erro.value"
      linha-clicavel
      texto-vazio="Nenhum caixa aberto até agora."
      @tentar-novamente="historico.carregar"
      @abrir-linha="selecionar"
    >
      <template #celula-competencia="{ linha }">
        <button
          type="button"
          class="fp-celula-nome competencia-link"
          @click="selecionar(linha)"
        >
          {{ rotuloCompetencia(competenciaDoCaixa(linha)) }}
        </button>
      </template>
      <template #celula-situacao="{ linha }">
        <SeloSituacaoCaixa :situacao="situacaoDoCaixaHistorico(linha)" />
      </template>
      <template #celula-inicial="{ linha }">
        <span class="celula-principal">{{ formatarMoeda(linha.resumo.valorInicial) }}</span>
      </template>
      <template #celula-entradas="{ linha }">
        <span class="celula-principal">{{ formatarMoeda(linha.resumo.totalEntradas) }}</span>
      </template>
      <template #celula-saidas="{ linha }">
        <span class="celula-principal">{{ formatarMoeda(linha.resumo.totalSaidas) }}</span>
      </template>
      <template #celula-final="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.resumo.saldoAtual) }}</span>
      </template>
    </TabelaDados>

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
.tabela-historico {
  min-height: 0;
}

.tabela-historico :deep(table) {
  min-width: max(720px, 100%);
}

.tabela-historico :deep(td) {
  height: 56px;
  padding-inline: 10px;
}

.tabela-historico :deep(th) {
  padding-inline: 10px;
}

.competencia-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.competencia-link:hover {
  text-decoration: underline;
}

.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-valor {
  font-weight: 600;
}
</style>
