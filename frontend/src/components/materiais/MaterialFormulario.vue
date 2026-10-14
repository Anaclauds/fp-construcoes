<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import type { FormularioMaterial } from '../../composables/useFormularioMaterial'
import { useOpcoesFornecedores } from '../../composables/useOpcoesFornecedores'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import { LIMITE_DESCRICAO_MATERIAL, LIMITE_NOME_MATERIAL, mascararValorMaterial } from '../../utils/materiais'
import CampoAutocomplete from '../ui/CampoAutocomplete.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{
  form: FormularioMaterial
  /** Código do material já cadastrado (edição); sem ele mostra "gerado ao salvar". */
  codigo?: string
  /** Versão para modal: código, categoria e unidade na mesma linha e títulos de seção menores. */
  compacto?: boolean
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')
const fornecedores = useOpcoesFornecedores()

/** Leva o foco ao primeiro campo com erro (chamar depois de `form.validar()` falhar). */
async function focarPrimeiroErro() {
  await nextTick()
  focarPrimeiroErroEm(raiz.value)
}

defineExpose({ focarPrimeiroErro })

const apoioFornecedor = computed(() =>
  fornecedores.indisponivel.value ? 'Lista de fornecedores indisponível no momento.' : undefined,
)
</script>

<template>
  <div
    ref="raiz"
    class="form-material"
    :class="{ 'form-material--compacto': compacto }"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        {{ compacto ? 'Informações Básicas' : 'Informações Básicas do Material' }}
      </h3>
      <div class="grade">
        <CampoFormulario
          class="c-codigo"
          :model-value="codigo ?? 'Gerado ao salvar'"
          :rotulo="codigo ? 'Código:' : 'Código (gerado automaticamente):'"
          somente-leitura
        />
        <CampoFormulario
          v-model="form.campos.nome"
          class="c-nome"
          rotulo="Nome do Material:"
          obrigatorio
          placeholder="Ex: Perfil U Enrijecido de Aço Galvanizado"
          autocomplete="off"
          :maxlength="LIMITE_NOME_MATERIAL"
          :erro="form.erros.nome"
        />
        <CampoFormulario
          v-model="form.campos.categoria"
          class="c-categoria"
          rotulo="Categoria:"
          tipo="select"
          obrigatorio
          placeholder="Selecione uma categoria"
          :opcoes="form.opcoes.value.categoria"
          :erro="form.erros.categoria"
        />
        <CampoFormulario
          v-model="form.campos.unidade"
          class="c-unidade"
          rotulo="Unidade de Medida:"
          tipo="select"
          obrigatorio
          placeholder="Selecione"
          :opcoes="form.opcoes.value.unidade"
          :erro="form.erros.unidade"
        />
        <!-- A API não limita a descrição (coluna TEXT): o limite de 1000 é só do front, por isso o contador fica visível. -->
        <CampoFormulario
          v-model="form.campos.descricao"
          class="c-descricao"
          rotulo="Descrição Detalhada:"
          tipo="area"
          placeholder="Descreva as características técnicas do material..."
          :linhas="compacto ? 3 : 2"
          :maxlength="LIMITE_DESCRICAO_MATERIAL"
          :aviso="`${form.campos.descricao.length}/${LIMITE_DESCRICAO_MATERIAL} caracteres`"
          :erro="form.erros.descricao"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Preço de Referência
      </h3>
      <div class="grade grade--preco">
        <CampoFormulario
          v-model="form.campos.preco"
          class="c-preco"
          rotulo="Preço Unitário (R$):"
          obrigatorio
          placeholder="0,00"
          inputmode="numeric"
          :mascara="mascararValorMaterial"
          :erro="form.erros.preco"
        />
        <CampoAutocomplete
          v-model="form.campos.fornecedor"
          class="c-fornecedor"
          rotulo="Fornecedor:"
          placeholder="Buscar fornecedor..."
          icone="lupa"
          limpavel
          :opcoes="fornecedores.opcoes.value"
          :rotulo-selecionado="form.fornecedorAtual?.nomeFantasia"
          :carregando="fornecedores.carregando.value"
          :desabilitado="fornecedores.indisponivel.value"
          :apoio="apoioFornecedor"
          texto-vazio="Nenhum fornecedor ativo encontrado."
          :erro="form.erros.fornecedor"
        />
        <p class="nota">
          * Valor de referência para orçamentos. O preço real pode variar conforme a negociação com o fornecedor.
        </p>
      </div>
    </section>

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
.form-material {
  /* Figma: campos de 40px de altura. */
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 26px;
}

.secao {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 22px;
  font-weight: 500;
}

.grade {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px 25px;
}

/* Página: código sozinho na primeira linha, nome em largura total, categoria e unidade lado a lado. */
.c-codigo { grid-column: span 4; }
.c-nome { grid-column: 1 / -1; }
.c-categoria { grid-column: span 8; }
.c-unidade { grid-column: span 4; }
.c-descricao { grid-column: 1 / -1; }
.c-preco { grid-column: span 4; }
.c-fornecedor { grid-column: span 8; }

.nota {
  grid-column: 1 / -1;
  margin: 0;
  color: #717182;
  font-size: 13px;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

/* Modal (Figma): Código | Categoria | Unidade na mesma linha, depois Nome e Descrição. */
.form-material--compacto {
  gap: 18px;
}

.form-material--compacto .secao-titulo {
  font-size: 18px;
}

.form-material--compacto .grade {
  gap: 10px 16px;
}

.form-material--compacto .c-codigo { grid-column: span 4; order: 1; }
.form-material--compacto .c-categoria { grid-column: span 4; order: 2; }
.form-material--compacto .c-unidade { grid-column: span 4; order: 3; }
.form-material--compacto .c-nome { order: 4; }
.form-material--compacto .c-descricao { order: 5; }
.form-material--compacto .c-preco { grid-column: span 6; }
.form-material--compacto .c-fornecedor { grid-column: span 6; }

@media (max-width: 700px) {
  .grade,
  .form-material--compacto .grade {
    grid-template-columns: 1fr;
  }

  .grade > *,
  .form-material--compacto .grade > * {
    grid-column: 1 / -1;
    order: 0;
  }
}
</style>
