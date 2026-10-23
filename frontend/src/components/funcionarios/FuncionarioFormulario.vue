<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import type { FormularioFuncionario } from '../../composables/useFormularioFuncionario'
import {
  mascararCep,
  mascararCpf,
  mascararMoeda,
  mascararTelefone,
} from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'

defineProps<{
  form: FormularioFuncionario
  /** Versão para modal: grade de 6 colunas e títulos de seção menores. */
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
    class="form-funcionario"
    :class="{ 'form-funcionario--compacto': compacto }"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Dados Pessoais
      </h3>
      <div class="grade">
        <CampoFormulario
          v-model="form.campos.nomeCompleto"
          class="s8 m6"
          rotulo="Nome completo:"
          obrigatorio
          placeholder="Digite o nome completo"
          autocomplete="off"
          :maxlength="180"
          :erro="form.erros.nomeCompleto"
        />
        <CampoFormulario
          v-model="form.campos.apelido"
          class="s4 m3"
          rotulo="Apelido:"
          placeholder="Apelido"
          autocomplete="off"
          :maxlength="80"
          :erro="form.erros.apelido"
        />
        <CampoFormulario
          v-model="form.campos.cpf"
          class="s3 m3"
          rotulo="CPF:"
          obrigatorio
          placeholder="000.000.000-00"
          inputmode="numeric"
          :mascara="mascararCpf"
          :erro="form.erros.cpf"
        />
        <CampoData
          v-model="form.campos.dataNascimento"
          class="s3 m4"
          rotulo="Data de Nascimento:"
          obrigatorio
          :erro="form.erros.dataNascimento"
        />
        <CampoFormulario
          v-model="form.campos.sexo"
          class="s3 m4"
          rotulo="Sexo:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o sexo"
          :opcoes="form.opcoes.value.sexo"
          :erro="form.erros.sexo"
        />
        <CampoFormulario
          v-model="form.campos.celular"
          class="s3 m4"
          rotulo="Celular:"
          obrigatorio
          placeholder="(00) 00000-0000"
          inputmode="tel"
          :mascara="mascararTelefone"
          :erro="form.erros.celular"
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
          v-model="form.campos.cidade"
          class="s5 m4"
          rotulo="Cidade:"
          obrigatorio
          placeholder="Digite a cidade"
          autocomplete="off"
          :maxlength="100"
          :erro="form.erros.cidade"
        />
        <CampoFormulario
          v-model="form.campos.estado"
          class="s3 m3"
          rotulo="Estado:"
          tipo="select"
          obrigatorio
          placeholder="UF"
          :opcoes="form.opcoes.value.estado"
          :erro="form.erros.estado"
        />
        <CampoFormulario
          v-model="form.campos.rua"
          class="s4 m6"
          rotulo="Rua:"
          obrigatorio
          placeholder="Digite a rua"
          autocomplete="off"
          :maxlength="150"
          :erro="form.erros.rua"
        />
        <CampoFormulario
          v-model="form.campos.numero"
          class="s2 m2"
          rotulo="Número:"
          obrigatorio
          placeholder="000"
          autocomplete="off"
          :maxlength="20"
          :erro="form.erros.numero"
        />
        <CampoFormulario
          v-model="form.campos.bairro"
          class="s3 m4"
          rotulo="Bairro:"
          obrigatorio
          placeholder="Digite o bairro"
          autocomplete="off"
          :maxlength="100"
          :erro="form.erros.bairro"
        />
        <CampoFormulario
          v-model="form.campos.complemento"
          class="s3 m12"
          rotulo="Complemento:"
          placeholder="Apartamento, bloco, etc."
          autocomplete="off"
          :maxlength="150"
          :erro="form.erros.complemento"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Informações de Trabalho
      </h3>
      <div class="grade">
        <CampoFormulario
          v-model="form.campos.funcao"
          class="s3 m4"
          rotulo="Função:"
          tipo="select"
          obrigatorio
          placeholder="Selecione a função"
          :opcoes="form.opcoes.value.funcao"
          :erro="form.erros.funcao"
        />
        <CampoFormulario
          v-model="form.campos.setorAtuacao"
          class="s3 m4"
          rotulo="Setor de atuação:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o setor"
          :opcoes="form.opcoes.value.setorAtuacao"
          :erro="form.erros.setorAtuacao"
        />
        <CampoFormulario
          v-model="form.campos.salario"
          class="s2 m4"
          rotulo="Salário:"
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          :mascara="mascararMoeda"
          :erro="form.erros.salario"
        />
        <CampoFormulario
          v-model="form.campos.tipoContrato"
          class="s2 m6"
          rotulo="Tipo de contrato:"
          tipo="select"
          obrigatorio
          placeholder="Selecione"
          :opcoes="form.opcoes.value.tipoContrato"
          :erro="form.erros.tipoContrato"
        />
        <CampoData
          v-model="form.campos.dataContratacao"
          class="s2 m6"
          rotulo="Data de contratação:"
          obrigatorio
          :erro="form.erros.dataContratacao"
        />
      </div>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Contato de emergência
      </h3>
      <div class="grade">
        <CampoFormulario
          v-model="form.campos.contatoEmergencia"
          class="s3 m4"
          rotulo="Contato de emergência:"
          obrigatorio
          placeholder="(00) 00000-0000"
          inputmode="tel"
          :mascara="mascararTelefone"
          :erro="form.erros.contatoEmergencia"
        />
        <CampoFormulario
          v-model="form.campos.nomeContatoEmergencia"
          class="s6 m4"
          rotulo="Nome do contato:"
          obrigatorio
          placeholder="Digite o nome do contato"
          autocomplete="off"
          :maxlength="150"
          :erro="form.erros.nomeContatoEmergencia"
        />
        <CampoFormulario
          v-model="form.campos.grauVinculo"
          class="s3 m4"
          rotulo="Grau de vínculo:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o vínculo"
          :opcoes="form.opcoes.value.grauVinculo"
          :erro="form.erros.grauVinculo"
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
.form-funcionario {
  /* Figma: campos de 33px de altura nesta página (cabe em 856px sem rolar). */
  --campo-altura: 34px;

  /* A largura útil depende do menu e da tela: a grade reage ao próprio formulário. */
  container-type: inline-size;

  display: flex;
  flex-direction: column;
  gap: 14px;
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

/* 12 colunas. Páginas usam as classes sN; o modal (compacto) usa mN. */
.grade {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 8px 25px;
}

.s2 { grid-column: span 2; }
.s3 { grid-column: span 3; }
.s4 { grid-column: span 4; }
.s5 { grid-column: span 5; }
.s6 { grid-column: span 6; }
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

.form-funcionario--compacto {
  --campo-altura: 42px;

  gap: 24px;
}

.form-funcionario--compacto .secao-titulo {
  font-size: 18px;
}

.form-funcionario--compacto .grade {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px 16px;
}

.form-funcionario--compacto .m2 { grid-column: span 2; }
.form-funcionario--compacto .m3 { grid-column: span 3; }
.form-funcionario--compacto .m4 { grid-column: span 4; }
.form-funcionario--compacto .m5 { grid-column: span 5; }
.form-funcionario--compacto .m6 { grid-column: span 6; }
.form-funcionario--compacto .m12 { grid-column: span 12; }

/* Formulário estreito (< 1050px, ex.: 1280px de tela com menu aberto): usa a distribuição
   do modal (mN), com menos campos por linha, para rótulos e placeholders não serem cortados. */
@container (max-width: 1050px) {
  .m2 { grid-column: span 2; }
  .m3 { grid-column: span 3; }
  .m4 { grid-column: span 4; }
  .m5 { grid-column: span 5; }
  .m6 { grid-column: span 6; }
  .m12 { grid-column: span 12; }
}

@media (max-width: 1100px) {
  .grade {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .s2,
  .s3 {
    grid-column: span 3;
  }

  .s4,
  .s5,
  .s6,
  .s8 {
    grid-column: span 6;
  }
}

@media (max-width: 700px) {
  .grade,
  .form-funcionario--compacto .grade {
    grid-template-columns: 1fr;
  }

  .grade > *,
  .form-funcionario--compacto .grade > * {
    grid-column: 1 / -1;
  }
}
</style>
