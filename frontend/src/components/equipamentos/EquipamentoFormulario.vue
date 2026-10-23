<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import type { FormularioEquipamento } from '../../composables/useFormularioEquipamento'
import { useOpcoesFornecedores } from '../../composables/useOpcoesFornecedores'
import {
  ANO_MINIMO_AQUISICAO,
  LIMITE_MARCA_EQUIPAMENTO,
  LIMITE_MODELO_EQUIPAMENTO,
  LIMITE_NOME_EQUIPAMENTO,
  LIMITE_OBSERVACOES_EQUIPAMENTO,
  mascararValorEquipamento,
} from '../../utils/equipamentos'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import { rotuloFornecedorVinculado } from '../../utils/fornecedores'
import CampoAutocomplete from '../ui/CampoAutocomplete.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{
  form: FormularioEquipamento
  /** Código patrimonial do equipamento já cadastrado (edição); sem ele mostra "gerado ao salvar". */
  codigo?: string
  /** Versão para modal: código e nome na mesma linha e títulos de seção menores. */
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
    class="form-equipamento"
    :class="{ 'form-equipamento--compacto': compacto }"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        {{ compacto ? 'Informações Básicas' : 'Informações Básicas do Equipamento' }}
      </h3>
      <div class="grade">
        <CampoFormulario
          class="c-codigo"
          :model-value="codigo ?? 'Gerado ao salvar'"
          :rotulo="codigo ? 'Código:' : 'Código Patrimonial (gerado automaticamente):'"
          somente-leitura
        />
        <CampoFormulario
          v-model="form.campos.nome"
          class="c-nome"
          rotulo="Nome do Equipamento:"
          obrigatorio
          placeholder="Ex: Serra Circular Makita"
          autocomplete="off"
          :maxlength="LIMITE_NOME_EQUIPAMENTO"
          :erro="form.erros.nome"
        />
        <CampoFormulario
          v-model="form.campos.tipo"
          class="c-terco"
          rotulo="Tipo de Equipamento:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o tipo"
          :opcoes="form.opcoes.value.tipo"
          :erro="form.erros.tipo"
        />
        <CampoFormulario
          v-model="form.campos.marca"
          class="c-terco"
          rotulo="Marca:"
          obrigatorio
          placeholder="Ex: Makita"
          autocomplete="off"
          :maxlength="LIMITE_MARCA_EQUIPAMENTO"
          :erro="form.erros.marca"
        />
        <CampoFormulario
          v-model="form.campos.modelo"
          class="c-terco"
          rotulo="Modelo:"
          placeholder="Ex: 5007MG"
          autocomplete="off"
          :maxlength="LIMITE_MODELO_EQUIPAMENTO"
          :erro="form.erros.modelo"
        />
        <!-- A API não limita as observações (coluna TEXT): o limite de 1000 é só do front, por isso o contador fica visível. -->
        <CampoFormulario
          v-model="form.campos.observacoes"
          class="c-observacoes"
          rotulo="Observações:"
          tipo="area"
          placeholder="Informações adicionais sobre o equipamento, histórico de manutenção, etc..."
          :linhas="compacto ? 3 : 2"
          :maxlength="LIMITE_OBSERVACOES_EQUIPAMENTO"
          :aviso="`${form.campos.observacoes.length}/${LIMITE_OBSERVACOES_EQUIPAMENTO} caracteres`"
          :erro="form.erros.observacoes"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Dados de Aquisição
      </h3>
      <div class="grade">
        <CampoData
          v-model="form.campos.data"
          class="c-terco"
          rotulo="Data de Aquisição:"
          :ano-minimo="ANO_MINIMO_AQUISICAO"
          :erro="form.erros.data"
        />
        <CampoFormulario
          v-model="form.campos.valor"
          class="c-terco"
          rotulo="Valor de Aquisição (R$):"
          placeholder="0,00"
          inputmode="numeric"
          :mascara="mascararValorEquipamento"
          :erro="form.erros.valor"
        />
        <CampoAutocomplete
          v-model="form.campos.fornecedor"
          class="c-terco"
          rotulo="Fornecedor:"
          placeholder="Buscar fornecedor..."
          icone="lupa"
          limpavel
          :opcoes="fornecedores.opcoes.value"
          :rotulo-selecionado="rotuloFornecedorVinculado(form.fornecedorAtual) || undefined"
          :carregando="fornecedores.carregando.value"
          :desabilitado="fornecedores.indisponivel.value"
          :apoio="apoioFornecedor"
          texto-vazio="Nenhum fornecedor ativo encontrado."
          :erro="form.erros.fornecedor"
        />
        <p class="nota">
          * Informações opcionais para controle patrimonial.
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
.form-equipamento {
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

/* Página: código sozinho na primeira linha; nome em largura total; tipo, marca e modelo lado a lado. */
.c-codigo { grid-column: span 4; }
.c-nome { grid-column: 1 / -1; }
.c-terco { grid-column: span 4; }
.c-observacoes { grid-column: 1 / -1; }

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

/* Modal (Figma): código e nome na mesma linha. */
.form-equipamento--compacto {
  gap: 18px;
}

.form-equipamento--compacto .secao-titulo {
  font-size: 18px;
}

.form-equipamento--compacto .grade {
  gap: 10px 16px;
}

.form-equipamento--compacto .c-nome {
  grid-column: span 8;
}

@media (max-width: 700px) {
  .grade,
  .form-equipamento--compacto .grade {
    grid-template-columns: 1fr;
  }

  .grade > *,
  .form-equipamento--compacto .grade > * {
    grid-column: 1 / -1;
  }
}
</style>
