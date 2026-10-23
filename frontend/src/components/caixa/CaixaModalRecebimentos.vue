<script setup lang="ts">
import { onMounted } from 'vue'
import { useRelatorioRecebimentosCaixa } from '../../composables/useRelatorioRecebimentosCaixa'
import type { RecebimentoRelatorio } from '../../types/caixa'
import { rotuloCompetencia } from '../../utils/caixa'
import { ROTULO_FORMA_PAGAMENTO } from '../../utils/cobrancas'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import type { FormaPagamento } from '../../types'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import ModalBase from '../ui/ModalBase.vue'
import TabelaDados, { type ColunaTabela } from '../ui/TabelaDados.vue'

/** Relatório de recebimentos (Cobranças) do período; começa no mês aberto no caixa. Monte com `v-if`. */
const props = defineProps<{ competencia: string }>()

const emit = defineEmits<{ fechar: [] }>()

const relatorio = useRelatorioRecebimentosCaixa(props.competencia)

const colunas: ColunaTabela[] = [
  { chave: 'data', rotulo: 'Data', largura: '12%' },
  { chave: 'projeto', rotulo: 'Projeto', largura: '28%' },
  { chave: 'cliente', rotulo: 'Cliente', largura: '22%' },
  { chave: 'forma', rotulo: 'Forma', largura: '19%' },
  { chave: 'valor', rotulo: 'Valor', largura: '19%', numerica: true },
]

function forma(valor: string): string {
  return ROTULO_FORMA_PAGAMENTO[valor as FormaPagamento] ?? valor
}

onMounted(relatorio.carregar)
</script>

<template>
  <ModalBase
    aberto
    titulo="Relatório de Recebimentos"
    :subtitulo="rotuloCompetencia(competencia)"
    icone="olho"
    largura="860px"
    @fechar="emit('fechar')"
  >
    <div class="periodo">
      <CampoData
        v-model="relatorio.dataInicio.value"
        rotulo="Data Inicial:"
        :erro="relatorio.erroInicio.value"
        :ano-minimo="2000"
      />
      <CampoData
        v-model="relatorio.dataFim.value"
        rotulo="Data Final:"
        :erro="relatorio.erroFim.value"
        :ano-minimo="2000"
      />
    </div>

    <dl
      v-if="relatorio.relatorio.value"
      class="indicadores"
      aria-label="Resumo dos recebimentos"
    >
      <div class="indicador">
        <dt>Total recebido</dt>
        <dd>{{ formatarMoeda(relatorio.relatorio.value.indicadores.totalRecebido) }}</dd>
      </div>
      <div class="indicador">
        <dt>Recebimentos</dt>
        <dd>{{ relatorio.relatorio.value.indicadores.quantidadeRecebimentos }}</dd>
      </div>
      <div class="indicador">
        <dt>Ticket médio</dt>
        <dd>{{ formatarMoeda(relatorio.relatorio.value.indicadores.ticketMedio) }}</dd>
      </div>
    </dl>

    <ul
      v-if="relatorio.relatorio.value && relatorio.relatorio.value.resumoPorFormaPagamento.length > 0"
      class="formas"
      aria-label="Recebido por forma de pagamento"
    >
      <li
        v-for="item in relatorio.relatorio.value.resumoPorFormaPagamento"
        :key="item.formaPagamento"
        class="forma"
      >
        {{ forma(item.formaPagamento) }}:
        <strong>{{ formatarMoeda(item.valor) }}</strong>
        <span>({{ item.quantidade }})</span>
      </li>
    </ul>

    <TabelaDados
      v-model:pagina="relatorio.pagina.value"
      class="tabela-recebimentos"
      rotulo="Recebimentos do período"
      :colunas="colunas"
      :linhas="relatorio.relatorio.value?.data ?? []"
      :chave-linha="(linha: RecebimentoRelatorio) => linha.id"
      :total="relatorio.relatorio.value?.meta.total ?? 0"
      :por-pagina="relatorio.porPagina"
      :carregando="relatorio.carregando.value"
      :erro="relatorio.erro.value"
      :texto-vazio="relatorio.periodoValido.value ? 'Nenhum recebimento no período.' : 'Informe um período válido para consultar os recebimentos.'"
      @tentar-novamente="relatorio.carregar"
    >
      <template #celula-data="{ linha }">
        <span class="celula-principal">{{ isoParaDataBr(linha.dataRecebimento) }}</span>
      </template>
      <template #celula-projeto="{ linha }">
        <span class="fp-celula-nome">{{ linha.projeto.titulo }}</span>
        <span class="celula-secundaria">Projeto {{ linha.projeto.numero }} · parcela {{ linha.parcela.numero }}</span>
      </template>
      <template #celula-cliente="{ linha }">
        <span class="celula-principal">{{ linha.cliente.nome }}</span>
      </template>
      <template #celula-forma="{ linha }">
        <span class="celula-principal">{{ forma(linha.formaPagamento) }}</span>
      </template>
      <template #celula-valor="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.valor) }}</span>
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
.periodo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.periodo > :deep(.campo) {
  width: 190px;
  max-width: 100%;
}

.indicadores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 14px 0 0;
}

.indicador {
  padding: 10px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.indicador dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.indicador dd {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 600;
}

.formas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  color: #555;
  font-size: 13px;
}

.forma strong {
  color: #333;
  font-weight: 600;
}

.forma span {
  color: var(--fp-cinza-rotulo);
}

.tabela-recebimentos {
  margin-top: 14px;
  min-height: 0;
}

.tabela-recebimentos :deep(table) {
  min-width: 640px;
}

.tabela-recebimentos :deep(td) {
  height: 56px;
  padding-inline: 10px;
}

.tabela-recebimentos :deep(th) {
  padding-inline: 10px;
}

.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-valor {
  font-weight: 600;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}

@media (max-width: 640px) {
  .indicadores {
    grid-template-columns: 1fr;
  }
}
</style>
