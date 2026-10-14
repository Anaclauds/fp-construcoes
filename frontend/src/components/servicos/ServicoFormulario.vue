<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import type { FormularioServico } from '../../composables/useFormularioServico'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import {
  LIMITE_DESCRICAO_SERVICO,
  LIMITE_NOME_SERVICO,
  mascararValorServico,
} from '../../utils/servicos'
import CampoFormulario from '../ui/CampoFormulario.vue'

defineProps<{
  form: FormularioServico
  /** Versão para modal: valor e unidade lado a lado e títulos de seção menores. */
  compacto?: boolean
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')

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
    class="form-servico"
    :class="{ 'form-servico--compacto': compacto }"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        {{ compacto ? 'Informações Básicas' : 'Informações Básicas do Serviço' }}
      </h3>
      <div class="campos">
        <CampoFormulario
          v-model="form.campos.nome"
          rotulo="Nome do Serviço:"
          obrigatorio
          placeholder="Ex: Instalação de Calhas em Alumínio"
          autocomplete="off"
          :maxlength="LIMITE_NOME_SERVICO"
          :erro="form.erros.nome"
        />
        <CampoFormulario
          v-model="form.campos.categoria"
          rotulo="Categoria:"
          tipo="select"
          obrigatorio
          placeholder="Selecione a categoria"
          :opcoes="form.opcoes.value.categoria"
          :erro="form.erros.categoria"
        />
        <!-- A API não limita a descrição (coluna TEXT): o limite de 1000 é só do front, por isso o contador fica visível. -->
        <CampoFormulario
          v-model="form.campos.descricao"
          rotulo="Descrição do Serviço:"
          tipo="area"
          placeholder="Descreva detalhadamente o serviço a ser executado..."
          :linhas="compacto ? 3 : 2"
          :maxlength="LIMITE_DESCRICAO_SERVICO"
          :aviso="`${form.campos.descricao.length}/${LIMITE_DESCRICAO_SERVICO} caracteres`"
          :erro="form.erros.descricao"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Precificação
      </h3>
      <div class="campos campos--preco">
        <CampoFormulario
          v-model="form.campos.valor"
          class="campo-valor"
          rotulo="Valor Unitário (R$):"
          obrigatorio
          placeholder="0,00"
          inputmode="numeric"
          :mascara="mascararValorServico"
          :erro="form.erros.valor"
        />
        <p class="nota">
          * O valor será utilizado como base nos orçamentos.
        </p>
        <CampoFormulario
          v-model="form.campos.unidade"
          class="campo-unidade"
          rotulo="Unidade de Medida:"
          tipo="select"
          obrigatorio
          placeholder="Selecione..."
          :opcoes="form.opcoes.value.unidade"
          :erro="form.erros.unidade"
        />
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
.form-servico {
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

.campos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nota {
  margin: 0;
  color: #717182;
  font-size: 13px;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

/* Modal: valor e unidade lado a lado (Figma), nota abaixo dos dois. */
.form-servico--compacto {
  gap: 18px;
}

.form-servico--compacto .secao-titulo {
  font-size: 18px;
}

.form-servico--compacto .campos--preco {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.form-servico--compacto .nota {
  grid-row: 2;
  grid-column: 1 / -1;
}

.form-servico--compacto .campo-valor {
  grid-row: 1;
  grid-column: 1;
}

.form-servico--compacto .campo-unidade {
  grid-row: 1;
  grid-column: 2;
}

@media (max-width: 600px) {
  .form-servico--compacto .campos--preco {
    grid-template-columns: 1fr;
  }

  .form-servico--compacto .campo-valor,
  .form-servico--compacto .campo-unidade,
  .form-servico--compacto .nota {
    grid-row: auto;
    grid-column: auto;
  }
}
</style>
