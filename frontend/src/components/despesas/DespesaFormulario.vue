<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import type { FormularioDespesa } from '../../composables/useFormularioDespesa'
import type { OpcoesCompraDespesa } from '../../composables/useOpcoesCompraDespesa'
import { useCategoriasDespesa } from '../../composables/useCategoriasDespesa'
import type { Despesa } from '../../types/despesa'
import { ANO_MINIMO_DESPESA, LIMITE_DESCRICAO_DESPESA, nomeFornecedor, projetoDoExtra } from '../../utils/despesas'
import { mascararMoeda } from '../../utils/formatadores'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import CampoAutocomplete, { type OpcaoAutocomplete } from '../ui/CampoAutocomplete.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario, { type OpcaoCampo } from '../ui/CampoFormulario.vue'
import DespesaItensCompra from './DespesaItensCompra.vue'
import DespesaNovaCategoria from './DespesaNovaCategoria.vue'
import DespesaSeletorTipo from './DespesaSeletorTipo.vue'

const props = defineProps<{
  form: FormularioDespesa
  opcoes: OpcoesCompraDespesa
  /** Despesa em edição; sem ela é um cadastro novo (o tipo ainda pode ser escolhido). */
  despesa?: Despesa
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')

const edicao = computed(() => props.despesa !== undefined)
const projetoExtra = computed(() => (props.despesa ? projetoDoExtra(props.despesa) : null))
const somenteDescricao = computed(() => props.form.somenteDescricao)

const catalogo = useCategoriasDespesa()
// Categoria da despesa que não está no catálogo de escolha (ex.: reservada ou excluída) continua visível na edição.
const opcoesCategoria = computed<OpcaoCampo[]>(() => {
  const lista = catalogo.escolhiveis.value.map((c) => ({ valor: c.nome, rotulo: c.rotulo }))
  const atual = props.form.campos.categoria
  if (atual !== '' && !lista.some((o) => o.valor === atual)) lista.push({ valor: atual, rotulo: catalogo.rotuloDe(atual) })
  return lista
})
const avisoCategoria = computed(() => (catalogo.erro.value ? `Não foi possível carregar as categorias. ${catalogo.erro.value}` : undefined))

/** Categoria recém-cadastrada: já vem selecionada. */
function aoCriarCategoria(nome: string) {
  props.form.campos.categoria = nome
}
const mascaraValor = (valor: string) => mascararMoeda(valor, 12)

// Compra de material precisa das listas de fornecedores e materiais: carrega ao escolher (ou abrir) esse tipo.
watch(
  () => props.form.compra.value,
  (compra) => {
    if (compra) void props.opcoes.carregar()
  },
)
onMounted(() => {
  if (props.form.compra.value) void props.opcoes.carregar()
  // Despesa diversa também escolhe fornecedor (opcional) e categoria do catálogo.
  void props.opcoes.carregarFornecedores()
  void catalogo.carregar()
})

const opcoesFornecedor = computed<OpcaoAutocomplete[]>(() => {
  const lista = props.opcoes.fornecedores.value.map((f) => ({
    valor: String(f.id),
    rotulo: nomeFornecedor(f),
    detalhe: f.razaoSocial,
  }))
  const atual = props.despesa?.fornecedor
  // Fornecedor da compra que não está mais entre os ativos continua visível (a API recusa salvar e a tela explica).
  if (atual && !lista.some((o) => o.valor === String(atual.id))) {
    lista.push({ valor: String(atual.id), rotulo: nomeFornecedor(atual), detalhe: atual.razaoSocial })
  }
  return lista
})

/** Leva o foco ao primeiro campo com erro (chamar depois de `form.validar()` falhar). */
async function focarPrimeiroErro() {
  await nextTick()
  focarPrimeiroErroEm(raiz.value)
}

defineExpose({ focarPrimeiroErro })
</script>

<template>
  <div
    ref="raiz"
    class="form-despesa"
  >
    <DespesaSeletorTipo
      v-if="!edicao"
      v-model="form.campos.tipo"
    />

    <p
      v-if="form.compra.value"
      class="nota-compra"
    >
      <template v-if="edicao">
        Alterar os materiais <strong>ajusta o estoque</strong> e o valor da <strong>saída no caixa</strong> do mês da
        compra.
      </template>
      <template v-else>
        Esta compra dá <strong>entrada no estoque</strong> dos materiais informados e é lançada como
        <strong>saída no caixa</strong> do mês da data da compra.
      </template>
    </p>

    <p
      v-if="form.compra.value && opcoes.semAcesso.value"
      class="aviso-acesso"
      role="alert"
    >
      {{ opcoes.textoSemAcesso.value }}
    </p>

    <template v-else>
      <p
        v-if="somenteDescricao"
        class="aviso-extra"
      >
        Despesa gerada pelo extra do projeto {{ projetoExtra }}: valor, data e categoria vêm do extra e ficam
        bloqueados. Só a descrição pode ser alterada aqui.
      </p>

      <div class="grade">
        <CampoFormulario
          v-if="somenteDescricao"
          :model-value="form.campos.data"
          rotulo="Data:"
          somente-leitura
        />
        <CampoData
          v-else
          v-model="form.campos.data"
          rotulo="Data:"
          obrigatorio
          :ano-minimo="ANO_MINIMO_DESPESA"
          :erro="form.erros.data"
        />

        <CampoFormulario
          v-if="somenteDescricao"
          :model-value="catalogo.rotuloDe(form.campos.categoria || null)"
          rotulo="Categoria:"
          somente-leitura
        />
        <CampoFormulario
          v-else-if="!form.compra.value"
          v-model="form.campos.categoria"
          rotulo="Categoria:"
          tipo="select"
          obrigatorio
          placeholder="Selecione..."
          :opcoes="opcoesCategoria"
          :erro="form.erros.categoria"
          :aviso="avisoCategoria"
        />
        <CampoAutocomplete
          v-else
          v-model="form.campos.fornecedorId"
          rotulo="Fornecedor:"
          obrigatorio
          placeholder="Busque pelo nome do fornecedor"
          icone="lupa"
          :opcoes="opcoesFornecedor"
          :carregando="opcoes.carregando.value"
          :erro="form.erros.fornecedorId"
          texto-vazio="Nenhum fornecedor ativo encontrado."
        />

        <DespesaNovaCategoria
          v-if="!form.compra.value && !somenteDescricao && catalogo.podeCadastrar.value"
          @criada="aoCriarCategoria"
        />

        <CampoFormulario
          v-if="somenteDescricao"
          :model-value="form.campos.valor"
          rotulo="Valor:"
          somente-leitura
        />
        <CampoFormulario
          v-else-if="!form.compra.value"
          v-model="form.campos.valor"
          rotulo="Valor:"
          obrigatorio
          placeholder="0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraValor"
          :erro="form.erros.valor"
        />

        <CampoAutocomplete
          v-if="!form.compra.value && !somenteDescricao"
          v-model="form.campos.fornecedorId"
          rotulo="Fornecedor (opcional):"
          placeholder="Busque pelo nome do fornecedor"
          icone="lupa"
          limpavel
          :opcoes="opcoesFornecedor"
          :carregando="opcoes.carregando.value"
          :erro="form.erros.fornecedorId"
          texto-vazio="Nenhum fornecedor ativo encontrado."
        />

        <CampoFormulario
          v-model="form.campos.descricao"
          class="grade-total"
          rotulo="Descrição:"
          tipo="area"
          obrigatorio
          :placeholder="form.compra.value ? 'Ex.: Compra de tubos para o galpão...' : 'Descreva a despesa...'"
          :linhas="3"
          :maxlength="LIMITE_DESCRICAO_DESPESA"
          :aviso="`${form.campos.descricao.length}/${LIMITE_DESCRICAO_DESPESA} caracteres`"
          :erro="form.erros.descricao"
        />
      </div>

      <DespesaItensCompra
        v-if="form.compra.value"
        :form="form"
        :opcoes="opcoes"
        :itens-atuais="despesa?.materiais ?? []"
      />
    </template>

    <p
      v-if="form.erroGeral.value"
      class="erro-geral"
      role="alert"
    >
      {{ form.erroGeral.value }}
    </p>
  </div>
</template>

<style scoped>
.form-despesa {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grade {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  align-items: start;
}

.grade-total {
  grid-column: 1 / -1;
}

.nota-compra {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--fp-verde-20);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
  color: var(--fp-verde);
  font-size: 13px;
}

.aviso-extra {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;
  color: #b45309;
  font-size: 13px;
}

.aviso-acesso {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;
  color: #b45309;
  font-size: 14px;
}

.erro-geral {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

@media (max-width: 600px) {
  .grade {
    grid-template-columns: 1fr;
  }
}
</style>
