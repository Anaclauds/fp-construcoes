<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from 'vue'
import type { FormularioDespesa } from '../../composables/useFormularioDespesa'
import type { OpcoesCompraDespesa } from '../../composables/useOpcoesCompraDespesa'
import type { Despesa } from '../../types/despesa'
import {
  ANO_MINIMO_DESPESA,
  LIMITE_DESCRICAO_DESPESA,
  OPCOES_CATEGORIA_DIVERSA,
  nomeFornecedor,
} from '../../utils/despesas'
import { mascararMoeda } from '../../utils/formatadores'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import CampoAutocomplete, { type OpcaoAutocomplete } from '../ui/CampoAutocomplete.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import DespesaItensCompra from './DespesaItensCompra.vue'
import DespesaSeletorTipo from './DespesaSeletorTipo.vue'

const props = defineProps<{
  form: FormularioDespesa
  opcoes: OpcoesCompraDespesa
  /** Despesa em edição; sem ela é um cadastro novo (o tipo ainda pode ser escolhido). */
  despesa?: Despesa
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')

const edicao = computed(() => props.despesa !== undefined)
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
      <div class="grade">
        <CampoData
          v-model="form.campos.data"
          rotulo="Data:"
          obrigatorio
          :ano-minimo="ANO_MINIMO_DESPESA"
          :erro="form.erros.data"
        />
        <CampoFormulario
          v-if="!form.compra.value"
          v-model="form.campos.categoria"
          rotulo="Categoria:"
          tipo="select"
          obrigatorio
          placeholder="Selecione..."
          :opcoes="OPCOES_CATEGORIA_DIVERSA"
          :erro="form.erros.categoria"
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
        <CampoFormulario
          v-if="!form.compra.value"
          v-model="form.campos.valor"
         
          rotulo="Valor:"
          obrigatorio
          placeholder="0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraValor"
          :erro="form.erros.valor"
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
