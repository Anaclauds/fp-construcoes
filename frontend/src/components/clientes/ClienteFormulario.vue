<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from 'vue'
import type { FormularioCliente } from '../../composables/useFormularioCliente'
import type { TipoCliente } from '../../types'
import {
  mascararCep,
  mascararCnpj,
  mascararCpf,
  mascararData,
  mascararTelefone,
} from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ClienteCampoCidade from './ClienteCampoCidade.vue'
import ClienteCamposRapidos from './ClienteCamposRapidos.vue'
import SeletorTipoCliente from './SeletorTipoCliente.vue'

const props = defineProps<{
  form: FormularioCliente
  /** Versão para modal: grade de 12 colunas mais densa, títulos menores e "Tipo" como select. */
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

/** Tipo escolhido enquanto a confirmação de troca está aberta. */
const tipoPendente = shallowRef<TipoCliente | null>(null)
// O select do navegador já mostra a opção clicada; a chave nova o devolve ao valor real se a troca for recusada.
const chaveSelectTipo = shallowRef(0)

function escolherTipo(valor: string) {
  const tipo = valor as TipoCliente
  if (tipo === props.form.campos.tipo || (tipo as string) === '') return
  if (props.form.temDadosDoTipo.value) tipoPendente.value = tipo
  else props.form.trocarTipo(tipo)
}

function confirmarTroca() {
  if (tipoPendente.value) props.form.trocarTipo(tipoPendente.value)
  tipoPendente.value = null
}

function recusarTroca() {
  tipoPendente.value = null
  chaveSelectTipo.value++
}

const mensagemTroca = computed(() => {
  const atual = props.form.campos.tipo
  const rotulo = atual === '' ? 'cadastro' : `Pessoa ${atual === 'PF' ? 'Física' : 'Jurídica'}`
  return `Os dados de ${rotulo} já preenchidos serão descartados. Celular e endereço serão mantidos.`
})

/** Leva o foco ao primeiro campo com erro (chamar depois de `form.validar()` falhar). */
async function focarPrimeiroErro() {
  await nextTick()
  raiz.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

defineExpose({ focarPrimeiroErro })
</script>

<template>
  <div
    ref="raiz"
    class="form-cliente"
    :class="{ 'form-cliente--compacto': compacto }"
  >
    <!-- Página: alternância PF | PJ. Modal: select "Tipo". -->
    <SeletorTipoCliente
      v-if="!compacto"
      :model-value="form.campos.tipo"
      @update:model-value="escolherTipo"
    />
    <div
      v-else
      class="grade"
    >
      <CampoFormulario
        :key="chaveSelectTipo"
        :model-value="form.campos.tipo"
        class="m4"
        rotulo="Tipo:"
        tipo="select"
        obrigatorio
        placeholder="Selecione o tipo"
        :opcoes="form.opcoes.value.tipo"
        @update:model-value="escolherTipo"
      />
      <p
        v-if="form.modo.value === 'rapido'"
        class="aviso-tipo m8"
      >
        Cadastro rápido: escolha o tipo para completar os dados do cliente.
      </p>
    </div>

    <section
      v-if="form.modo.value === 'rapido'"
      class="secao"
    >
      <h3 class="secao-titulo">
        Dados do Cliente
      </h3>
      <ClienteCamposRapidos
        :form="form"
        grade
      />
    </section>

    <template v-else>
      <section
        v-if="form.modo.value === 'PF'"
        class="secao"
      >
        <h3 class="secao-titulo">
          Dados Pessoais
        </h3>
        <div class="grade">
          <CampoFormulario
            v-model="form.campos.nome"
            class="s8 m8"
            rotulo="Nome completo:"
            obrigatorio
            placeholder="Digite o nome completo"
            autocomplete="off"
            :maxlength="180"
            :erro="form.erros.nome"
          />
          <CampoFormulario
            v-model="form.campos.apelido"
            class="s4 m4"
            rotulo="Apelido:"
            placeholder="Como prefere ser chamado"
            autocomplete="off"
            :maxlength="80"
            :erro="form.erros.apelido"
          />
          <CampoFormulario
            v-model="form.campos.cpf"
            class="s3 m4"
            rotulo="CPF:"
            obrigatorio
            placeholder="000.000.000-00"
            inputmode="numeric"
            :mascara="mascararCpf"
            :erro="form.erros.cpf"
          />
          <CampoFormulario
            v-model="form.campos.dataNascimento"
            class="s2 m4"
            rotulo="Data de Nascimento:"
            obrigatorio
            placeholder="DD/MM/AAAA"
            inputmode="numeric"
            :mascara="mascararData"
            :erro="form.erros.dataNascimento"
          />
          <CampoFormulario
            v-model="form.campos.sexo"
            class="s4 m4"
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

      <section
        v-else
        class="secao"
      >
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
            :maxlength="180"
            :erro="form.erros.razaoSocial"
          />
          <CampoFormulario
            v-model="form.campos.nomeFantasia"
            class="s4 m4"
            rotulo="Nome Fantasia:"
            obrigatorio
            placeholder="Como prefere ser chamado"
            autocomplete="off"
            :maxlength="150"
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
            v-model="form.campos.celular"
            class="s2 m4"
            rotulo="Celular:"
            obrigatorio
            placeholder="(00) 00000-0000"
            inputmode="tel"
            :mascara="mascararTelefone"
            :erro="form.erros.celular"
          />
          <CampoFormulario
            v-model="form.campos.responsavel"
            class="s4 m4"
            rotulo="Responsável:"
            obrigatorio
            placeholder="Contato na empresa"
            autocomplete="off"
            :maxlength="150"
            :erro="form.erros.responsavel"
          />
          <CampoFormulario
            v-model="form.campos.cargoResponsavel"
            class="s3 m8"
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
          <ClienteCampoCidade
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
    </template>

    <p
      v-if="form.erroGeral.value"
      class="erro-geral"
      role="alert"
    >
      {{ form.erroGeral.value }}
    </p>

    <ModalDescartar
      :aberto="tipoPendente !== null"
      titulo="Trocar o tipo de cliente?"
      :mensagem="mensagemTroca"
      texto-confirmar="Trocar tipo"
      texto-cancelar="Manter"
      @confirmar="confirmarTroca"
      @fechar="recusarTroca"
    />
  </div>
</template>

<style scoped>
.form-cliente {
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
  gap: 14px;
}

/* Figma: ~23px entre o fim de uma seção e o título da próxima. */
.secao + .secao {
  margin-top: 9px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 22px;
  font-weight: 500;
}

/* 12 colunas. A página usa as classes sN; o modal (compacto) usa mN. */
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

.aviso-tipo {
  margin: 0;
  align-self: end;
  padding-bottom: 8px;
  color: #717182;
  font-size: 13px;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.form-cliente--compacto {
  --campo-altura: 40px;

  gap: 14px;
}

.form-cliente--compacto .secao {
  gap: 8px;
}

.form-cliente--compacto .secao + .secao {
  margin-top: 0;
}

.form-cliente--compacto .secao-titulo {
  font-size: 18px;
}

.form-cliente--compacto .grade {
  gap: 10px 16px;
}

.form-cliente--compacto .m2 { grid-column: span 2; }
.form-cliente--compacto .m3 { grid-column: span 3; }
.form-cliente--compacto .m4 { grid-column: span 4; }
.form-cliente--compacto .m5 { grid-column: span 5; }
.form-cliente--compacto .m6 { grid-column: span 6; }
.form-cliente--compacto .m8 { grid-column: span 8; }
.form-cliente--compacto .m12 { grid-column: span 12; }

/* Formulário estreito (ex.: 1280px de tela com menu aberto): usa a distribuição do modal (mN),
   com menos campos por linha, para rótulos e placeholders não serem cortados. */
@container (max-width: 1050px) {
  .m2 { grid-column: span 2; }
  .m3 { grid-column: span 3; }
  .m4 { grid-column: span 4; }
  .m5 { grid-column: span 5; }
  .m6 { grid-column: span 6; }
  .m8 { grid-column: span 8; }
  .m12 { grid-column: span 12; }
}

@media (max-width: 700px) {
  .grade,
  .form-cliente--compacto .grade {
    grid-template-columns: 1fr;
  }

  .grade > *,
  .form-cliente--compacto .grade > * {
    grid-column: 1 / -1;
  }
}
</style>
