<script setup lang="ts">
import { computed } from 'vue'
import type { ErrosLinhaExtra, LinhaExtraServico } from '../../composables/useFormularioExtraProjeto'
import type { OpcaoServico } from '../../types/orcamento'
import { mascararMoeda } from '../../utils/formatadores'
import { centavosParaMoeda, mascararDecimal, rotuloUnidade, textoParaEscala } from '../../utils/orcamentos'
import { centavosDoCampoMoeda } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const props = defineProps<{
  linhas: LinhaExtraServico[]
  /** Serviços ativos da categoria do projeto. */
  opcoes: OpcaoServico[]
  erros: Record<number, ErrosLinhaExtra>
  servicosEmUso: (exceto: LinhaExtraServico) => Set<string>
  carregando: boolean
}>()

const emit = defineEmits<{
  adicionar: []
  remover: [linha: LinhaExtraServico]
}>()

const mascararQuantidade = (valor: string) => mascararDecimal(valor, 3, 9)

const unidades = computed(() => new Map(props.opcoes.map((s) => [String(s.id), rotuloUnidade(s.unidadeMedida)])))

function opcoesDaLinha(linha: LinhaExtraServico) {
  const emUso = props.servicosEmUso(linha)
  return props.opcoes
    .filter((s) => !emUso.has(String(s.id)))
    .map((s) => ({ valor: String(s.id), rotulo: s.nome }))
}

const placeholderServico = computed(() => {
  if (props.carregando) return 'Carregando serviços...'
  if (props.opcoes.length === 0) return 'Nenhum serviço ativo nesta categoria'
  return 'Selecione...'
})

function totalDaLinha(linha: LinhaExtraServico): string {
  const quantidade = textoParaEscala(linha.quantidade, 3)
  const custo = centavosDoCampoMoeda(linha.custo)
  return quantidade === null || custo === null ? '—' : centavosParaMoeda(Math.round((quantidade * custo) / 1000))
}

function editarCusto(linha: LinhaExtraServico, valor: string) {
  linha.custo = valor
  linha.custoEditado = true
}
</script>

<template>
  <section class="itens">
    <h3 class="secao-titulo">
      Serviços Adicionais
    </h3>
    <p class="secao-apoio">
      Serviço adicional com custo maior que zero gera uma despesa e uma saída no caixa do mês do registro.
      Com o caixa do mês fechado o registro é recusado.
    </p>

    <article
      v-for="(linha, indice) in linhas"
      :key="linha.uid"
      class="linha"
    >
      <header class="linha-topo">
        <span class="linha-numero">Serviço {{ indice + 1 }}</span>
        <button
          type="button"
          class="linha-remover"
          :aria-label="`Remover serviço ${indice + 1}`"
          :disabled="linhas.length === 1 && linha.servicoId === '' && linha.quantidade === '' && linha.descricao === ''"
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
        :erro="erros[linha.uid]?.item"
      />

      <div class="linha-grade">
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Qtd.:"
          obrigatorio
          placeholder="0"
          autocomplete="off"
          :mascara="mascararQuantidade"
          :erro="erros[linha.uid]?.quantidade"
        />
        <CampoFormulario
          :model-value="unidades.get(linha.servicoId) ?? ''"
          rotulo="Unidade de Medida:"
          somente-leitura
          placeholder="—"
        />
        <CampoFormulario
          :model-value="linha.custo"
          rotulo="Custo interno estimado (R$):"
          aviso="Valor por unidade."
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="erros[linha.uid]?.custo"
          @update:model-value="editarCusto(linha, $event)"
        />
        <CampoFormulario
          :model-value="totalDaLinha(linha)"
          rotulo="Custo total:"
          somente-leitura
          placeholder="—"
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
  grid-template-columns: 0.7fr 0.9fr 1.5fr 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 760px) {
  .linha-grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
