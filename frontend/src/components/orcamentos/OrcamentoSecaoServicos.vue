<script setup lang="ts">
import { computed } from 'vue'
import type { FormularioOrcamento, LinhaServico } from '../../composables/useFormularioOrcamento'
import { centavosParaMoeda, mascararDecimal, rotuloUnidade, totalDoItem } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario, { type OpcaoCampo } from '../ui/CampoFormulario.vue'
import BotaoAdicionarItem from './BotaoAdicionarItem.vue'

const props = defineProps<{ form: FormularioOrcamento }>()

const mascaraQuantidade = (valor: string) => mascararDecimal(valor, 3)
const mascaraValor = (valor: string) => mascararDecimal(valor, 2)

const semTipo = computed(() => props.form.campos.tipo === '')

/** Serviços do tipo do orçamento; os já usados em outras linhas ficam de fora (sem repetição). */
function opcoesDaLinha(linha: LinhaServico): OpcaoCampo[] {
  const usados = new Set(
    props.form.servicos.value.filter((l) => l.chave !== linha.chave && l.servicoId !== '').map((l) => l.servicoId),
  )
  return props.form.servicosDoTipo.value
    .filter((servico) => !usados.has(String(servico.id)))
    .map((servico) => ({ valor: String(servico.id), rotulo: servico.nome }))
}

function unidade(linha: LinhaServico): string | undefined {
  const servico = props.form.servicosDoTipo.value.find((s) => String(s.id) === linha.servicoId)
  return servico ? `Unidade: ${rotuloUnidade(servico.unidadeMedida)}` : undefined
}

function total(linha: LinhaServico): string {
  return centavosParaMoeda(totalDoItem(linha) ?? 0)
}

const placeholderServico = computed(() => (semTipo.value ? 'Selecione o tipo primeiro' : 'Selecione um serviço'))
</script>

<template>
  <section
    class="secao"
    aria-labelledby="orc-servicos"
  >
    <h3
      id="orc-servicos"
      class="secao-titulo"
    >
      Serviços / Mão de Obra
    </h3>

    <p
      v-if="!semTipo && form.servicosDoTipo.value.length === 0 && !form.opcoes.carregando.value"
      class="aviso"
    >
      Não há serviços ativos cadastrados para este tipo de orçamento.
    </p>

    <div class="itens">
      <div
        v-for="(linha, i) in form.servicos.value"
        :key="linha.chave"
        class="linha"
        :class="{ 'linha--primeira': i === 0 }"
        role="group"
        :aria-label="`Serviço ${i + 1}`"
      >
        <CampoFormulario
          :model-value="linha.servicoId"
          rotulo="Serviço:"
          tipo="select"
          :placeholder="placeholderServico"
          :desabilitado="semTipo"
          :opcoes="opcoesDaLinha(linha)"
          :erro="form.errosServicos[linha.chave]?.item"
          :aviso="unidade(linha)"
          @update:model-value="form.escolherServico(linha, $event)"
        />
        <CampoFormulario
          v-model="linha.descricao"
          rotulo="Descrição Adicional:"
          placeholder="Detalhes adicionais (opcional)"
          autocomplete="off"
          :maxlength="1000"
          :erro="form.errosServicos[linha.chave]?.descricao"
        />
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Quantidade:"
          placeholder="0"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraQuantidade"
          :erro="form.errosServicos[linha.chave]?.quantidade"
          @update:model-value="form.aoDigitarServico(linha, 'quantidade')"
        />
        <CampoFormulario
          v-model="linha.valorUnitario"
          rotulo="Valor Unitário:"
          placeholder="0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraValor"
          :erro="form.errosServicos[linha.chave]?.valorUnitario"
          @update:model-value="form.aoDigitarServico(linha, 'valorUnitario')"
        />
        <CampoFormulario
          rotulo="Total:"
          somente-leitura
          :model-value="total(linha)"
        />
        <BotaoFp
          class="remover"
          variante="perigo-suave"
          tamanho="pagina"
          :aria-label="`Remover serviço ${i + 1}`"
          @click="form.removerServico(linha.chave)"
        >
          Remover
        </BotaoFp>
      </div>
    </div>

    <BotaoAdicionarItem
      rotulo="Adicionar Serviço"
      :data-erro-foco="form.erros.itens ? 'true' : undefined"
      @click="form.adicionarServico"
    />
  </section>
</template>

<style scoped>
.secao {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: var(--orc-titulo-secao, 22px);
  font-weight: 500;
}

.itens {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Colunas: serviço | descrição | quantidade | valor unitário | total | remover. */
.linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) var(--col-qtd, 112px) var(--col-valor, 135px) var(--col-total, 135px) var(--col-remover, 104px);
  gap: 10px;
  align-items: start;
}

/* Rótulos só na primeira linha; nas demais ficam só para leitor de tela. */
.linha:not(.linha--primeira) :deep(.campo-rotulo) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.remover {
  height: var(--campo-altura, 42px);
}

.linha--primeira .remover {
  margin-top: 27px;
}

.aviso {
  margin: 0;
  color: #717182;
  font-size: 13px;
}

/* Bloco estreito: cada item vira um cartão com rótulos em todas as linhas. */
@container (max-width: 960px) {
  .linha {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 14px;
    border: 1px solid var(--fp-verde-20);
    border-radius: var(--fp-raio);
  }

  .linha > :nth-child(1),
  .linha > :nth-child(2) {
    grid-column: 1 / -1;
  }

  .linha:not(.linha--primeira) :deep(.campo-rotulo) {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
  }

  .linha .remover,
  .linha--primeira .remover {
    grid-column: 1 / -1;
    margin-top: 0;
    justify-self: end;
  }
}
</style>
