<script setup lang="ts">
import { computed } from 'vue'
import type { ErrosLinhaServico, LinhaServicoEtapa } from '../../composables/useFormularioEtapaProjeto'
import type { OpcaoServico } from '../../types/orcamento'
import { mascararMoeda } from '../../utils/formatadores'
import { filtrarDecimal, normalizarDecimal, rotuloUnidade } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const props = defineProps<{
  linhas: LinhaServicoEtapa[]
  /** Serviços ativos da categoria do projeto. */
  opcoes: OpcaoServico[]
  erros: Record<number, ErrosLinhaServico>
  servicosEmUso: (exceto: LinhaServicoEtapa) => Set<string>
  carregando: boolean
}>()

const emit = defineEmits<{
  adicionar: []
  remover: [linha: LinhaServicoEtapa]
}>()

const mascararQuantidade = (valor: string) => filtrarDecimal(valor, 3, 9)
const normalizarQuantidade = (valor: string) => normalizarDecimal(valor, 3, 9)

function opcoesDaLinha(linha: LinhaServicoEtapa) {
  const emUso = props.servicosEmUso(linha)
  return props.opcoes
    .filter((opcao) => !emUso.has(String(opcao.id)))
    .map((opcao) => ({ valor: String(opcao.id), rotulo: opcao.nome }))
}

const unidades = computed(() => new Map(props.opcoes.map((opcao) => [String(opcao.id), rotuloUnidade(opcao.unidadeMedida)])))

function unidadeDaLinha(linha: LinhaServicoEtapa): string {
  return unidades.value.get(linha.servicoId) ?? ''
}

const placeholderServico = computed(() => {
  if (props.carregando) return 'Carregando serviços...'
  if (props.opcoes.length === 0) return 'Nenhum serviço ativo nesta categoria'
  return 'Selecione...'
})

function editarValor(linha: LinhaServicoEtapa, valor: string) {
  linha.valorUnitario = valor
  linha.valorEditado = true
}

function editarCusto(linha: LinhaServicoEtapa, valor: string) {
  linha.custo = valor
  linha.custoEditado = true
}
</script>

<template>
  <section class="servicos">
    <h3 class="secao-titulo">
      Serviços executados
    </h3>

    <article
      v-for="(linha, indice) in linhas"
      :key="linha.uid"
      class="linha"
    >
      <header class="linha-topo">
        <span class="linha-numero">Serviço {{ indice + 1 }}</span>
        <button
          v-if="linhas.length > 1"
          type="button"
          class="linha-remover"
          :aria-label="`Remover serviço ${indice + 1}`"
          @click="emit('remover', linha)"
        >
          Remover
        </button>
      </header>

      <CampoFormulario
        v-model="linha.servicoId"
        rotulo="Nome do Serviço:"
        tipo="select"
        obrigatorio
        :placeholder="placeholderServico"
        :opcoes="opcoesDaLinha(linha)"
        :desabilitado="carregando"
        :erro="erros[linha.uid]?.servicoId"
      />

      <div class="linha-grade">
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Qtd.:"
          obrigatorio
          placeholder="0"
          autocomplete="off"
          inputmode="decimal"
          :mascara="mascararQuantidade"
          :normalizar="normalizarQuantidade"
          :erro="erros[linha.uid]?.quantidade"
        />
        <CampoFormulario
          :model-value="unidadeDaLinha(linha)"
          rotulo="Unidade de Medida:"
          somente-leitura
          placeholder="—"
        />
        <CampoFormulario
          :model-value="linha.valorUnitario"
          rotulo="Valor unitário (R$):"
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="erros[linha.uid]?.valorUnitario"
          @update:model-value="editarValor(linha, $event)"
        />
        <CampoFormulario
          :model-value="linha.custo"
          rotulo="Custo interno estimado (R$):"
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="erros[linha.uid]?.custo"
          @update:model-value="editarCusto(linha, $event)"
        />
      </div>

      <CampoFormulario
        v-model="linha.descricao"
        rotulo="Descrição do Serviço"
        placeholder="Descrição opcional"
        autocomplete="off"
        :maxlength="200"
      />
    </article>

    <div>
      <BotaoFp
        variante="secundario"
        tamanho="compacto"
        :desabilitado="carregando"
        @click="emit('adicionar')"
      >
        + Adicionar serviço
      </BotaoFp>
    </div>
  </section>
</template>

<style scoped>
.servicos {
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

/* Figma: cada serviço fica num cartão com os campos empilhados e o botão Adicionar. */
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

.linha-remover:hover {
  text-decoration: underline;
}

.linha-remover:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.linha-grade {
  display: grid;
  grid-template-columns: 0.7fr 0.9fr 1fr 1.3fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 760px) {
  .linha-grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
