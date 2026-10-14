<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import type { FormularioFornecedor } from '../../composables/useFormularioFornecedor'
import { mascararCep, mascararCnpj, mascararTelefone } from '../../utils/formatadores'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import {
  LIMITE_BAIRRO,
  LIMITE_COMPLEMENTO,
  LIMITE_NOME_FANTASIA,
  LIMITE_NUMERO,
  LIMITE_RAZAO_SOCIAL,
  LIMITE_RESPONSAVEL,
  LIMITE_RUA,
} from '../../utils/fornecedores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import FornecedorCampoCidade from './FornecedorCampoCidade.vue'

defineProps<{
  form: FormularioFornecedor
  /** Versão para modal: grade de 12 colunas mais densa e títulos de seção menores. */
  compacto?: boolean
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')

// Formulário estreito (modal ou página com menu aberto em tela menor): o campo Estado só cabe com "UF" no placeholder.
const LARGURA_ESTREITA = 1050
const estreito = shallowRef(false)
let observador: ResizeObserver | null = null

onMounted(() => {
  if (!raiz.value) return
  observador = new ResizeObserver(([entrada]) => {
    if (entrada) estreito.value = entrada.contentRect.width < LARGURA_ESTREITA
  })
  observador.observe(raiz.value)
})

onBeforeUnmount(() => observador?.disconnect())

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
    class="form-fornecedor"
    :class="{ 'form-fornecedor--compacto': compacto }"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Dados Empresariais
      </h3>
      <div class="grade">
        <CampoFormulario
          v-model="form.campos.razaoSocial"
          class="s8 m8"
          rotulo="Razão Social:"
          obrigatorio
          placeholder="Digite a razão social da empresa"
          autocomplete="off"
          :maxlength="LIMITE_RAZAO_SOCIAL"
          :erro="form.erros.razaoSocial"
        />
        <CampoFormulario
          v-model="form.campos.nomeFantasia"
          class="s4 m4"
          rotulo="Nome Fantasia:"
          obrigatorio
          placeholder="Nome fantasia"
          autocomplete="off"
          :maxlength="LIMITE_NOME_FANTASIA"
          :erro="form.erros.nomeFantasia"
        />
        <CampoFormulario
          v-model="form.campos.cnpj"
          class="s3 m4"
          rotulo="CNPJ:"
          obrigatorio
          placeholder="00.000.000/0000-00"
          inputmode="numeric"
          :mascara="mascararCnpj"
          :erro="form.erros.cnpj"
        />
        <CampoFormulario
          v-model="form.campos.contato"
          class="s3 m4"
          rotulo="Contato:"
          obrigatorio
          placeholder="(00) 00000-0000"
          inputmode="tel"
          :mascara="mascararTelefone"
          :erro="form.erros.contato"
        />
        <CampoFormulario
          v-model="form.campos.responsavel"
          class="s3 m4"
          rotulo="Responsável:"
          obrigatorio
          placeholder="Contato na empresa"
          autocomplete="off"
          :maxlength="LIMITE_RESPONSAVEL"
          :erro="form.erros.responsavel"
        />
        <CampoFormulario
          v-model="form.campos.cargoResponsavel"
          class="s3 m4"
          rotulo="Cargo do Responsável:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o cargo"
          :opcoes="form.opcoes.value.cargoResponsavel"
          :erro="form.erros.cargoResponsavel"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Endereço
      </h3>
      <div class="grade">
        <div class="cep-linha s4 m5">
          <CampoFormulario
            v-model="form.campos.cep"
            class="cep-campo"
            rotulo="CEP:"
            obrigatorio
            placeholder="00000-000"
            inputmode="numeric"
            :mascara="mascararCep"
            :erro="form.erros.cep"
            @keydown.enter.prevent="form.buscarCep()"
          />
          <BotaoFp
            class="cep-botao"
            tamanho="pagina"
            variante="primario"
            :carregando="form.buscandoCep.value"
            @click="form.buscarCep()"
          >
            Buscar
          </BotaoFp>
        </div>
        <CampoFormulario
          :model-value="form.campos.estado"
          class="s3 m2"
          rotulo="Estado:"
          tipo="select"
          obrigatorio
          :placeholder="estreito ? 'UF' : 'Selecione o estado'"
          :opcoes="form.opcoes.value.estado"
          :erro="form.erros.estado"
          @update:model-value="form.aoMudarEstado"
        />
        <FornecedorCampoCidade
          class="s5 m5"
          :form="form"
        />
        <CampoFormulario
          v-model="form.campos.rua"
          class="s4 m6"
          rotulo="Rua:"
          obrigatorio
          placeholder="Digite a rua"
          autocomplete="off"
          :maxlength="LIMITE_RUA"
          :erro="form.erros.rua"
        />
        <CampoFormulario
          v-model="form.campos.numero"
          class="s2 m2"
          rotulo="Número:"
          obrigatorio
          placeholder="000"
          autocomplete="off"
          :maxlength="LIMITE_NUMERO"
          :erro="form.erros.numero"
        />
        <CampoFormulario
          v-model="form.campos.bairro"
          class="s3 m4"
          rotulo="Bairro:"
          obrigatorio
          placeholder="Digite o bairro"
          autocomplete="off"
          :maxlength="LIMITE_BAIRRO"
          :erro="form.erros.bairro"
        />
        <CampoFormulario
          v-model="form.campos.complemento"
          class="s3 m12"
          rotulo="Complemento:"
          placeholder="Apartamento, bloco, etc."
          autocomplete="off"
          :maxlength="LIMITE_COMPLEMENTO"
          :erro="form.erros.complemento"
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
.form-fornecedor {
  /* Figma: campos de 40px de altura. */
  --campo-altura: 40px;

  /* A largura útil depende do menu e da tela: a grade reage ao próprio formulário. */
  container-type: inline-size;

  display: flex;
  flex-direction: column;
  gap: 18px;
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

/* 12 colunas. A página usa as classes sN; o modal (compacto) e o formulário estreito usam mN. */
.grade {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px 25px;
}

.s2 { grid-column: span 2; }
.s3 { grid-column: span 3; }
.s4 { grid-column: span 4; }
.s5 { grid-column: span 5; }
.s8 { grid-column: span 8; }

.cep-linha {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cep-campo {
  flex: 1;
}

/* Alinha o botão ao input: altura do rótulo (21px) + espaço (6px). */
.cep-botao {
  flex-shrink: 0;
  margin-top: 27px;
  height: var(--campo-altura);
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.form-fornecedor--compacto {
  gap: 16px;
}

.form-fornecedor--compacto .secao {
  gap: 8px;
}

.form-fornecedor--compacto .secao-titulo {
  font-size: 18px;
}

.form-fornecedor--compacto .grade {
  gap: 10px 16px;
}

.form-fornecedor--compacto .m2 { grid-column: span 2; }
.form-fornecedor--compacto .m4 { grid-column: span 4; }
.form-fornecedor--compacto .m5 { grid-column: span 5; }
.form-fornecedor--compacto .m6 { grid-column: span 6; }
.form-fornecedor--compacto .m8 { grid-column: span 8; }
.form-fornecedor--compacto .m12 { grid-column: span 12; }

/* Formulário estreito (ex.: 1280px de tela com menu aberto): menos campos por linha. */
@container (max-width: 1050px) {
  .m2 { grid-column: span 2; }
  .m4 { grid-column: span 4; }
  .m5 { grid-column: span 5; }
  .m6 { grid-column: span 6; }
  .m8 { grid-column: span 8; }
  .m12 { grid-column: span 12; }
}

@media (max-width: 700px) {
  .grade,
  .form-fornecedor--compacto .grade {
    grid-template-columns: 1fr;
  }

  .grade > *,
  .form-fornecedor--compacto .grade > * {
    grid-column: 1 / -1;
  }
}
</style>
