<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import type { FormularioOrcamento } from '../../composables/useFormularioOrcamento'
import type { TipoOrcamento } from '../../types'
import { OPCOES_TIPO_ORCAMENTO, ROTULO_TIPO_ORCAMENTO } from '../../utils/orcamentos'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import OrcamentoCampoCliente from './OrcamentoCampoCliente.vue'
import OrcamentoResumo from './OrcamentoResumo.vue'
import OrcamentoSecaoMateriais from './OrcamentoSecaoMateriais.vue'
import OrcamentoSecaoServicos from './OrcamentoSecaoServicos.vue'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'

const props = defineProps<{
  form: FormularioOrcamento
  /** Versão do modal de edição: títulos menores e cidade do cliente ao lado do nome. */
  compacto?: boolean
}>()

const raiz = useTemplateRef<HTMLElement>('raiz')

onMounted(() => void props.form.opcoes.carregar())

/** Tipo escolhido enquanto a confirmação de troca (que remove serviços de outro tipo) está aberta. */
const tipoPendente = shallowRef<TipoOrcamento | null>(null)
// O select já mostra a opção clicada; a chave nova o devolve ao valor real se a troca for recusada.
const chaveSelectTipo = shallowRef(0)

function escolherTipo(valor: string) {
  const tipo = valor as TipoOrcamento | ''
  if (tipo === '' || tipo === props.form.campos.tipo) return
  if (props.form.servicosIncompativeis(tipo).length > 0) tipoPendente.value = tipo
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
  if (!tipoPendente.value) return ''
  const nomes = props.form.servicosIncompativeis(tipoPendente.value).map((linha) => {
    const servico = props.form.opcoes.servicosPorId.value.get(linha.servicoId)
    return servico?.nome ?? 'Serviço'
  })
  const lista = nomes.length === 1 ? `o serviço ${nomes[0]}` : `os serviços ${nomes.join(', ')}`
  return `Ao mudar para ${ROTULO_TIPO_ORCAMENTO[tipoPendente.value]}, ${lista} não serão mantidos, porque pertencem a outro tipo de orçamento. Os materiais continuam.`
})

/** Leva o foco ao primeiro campo com erro (chamar depois de `form.validar()` falhar). */
async function focarPrimeiroErro() {
  await nextTick()
  focarPrimeiroErroEm(raiz.value, '[aria-invalid="true"], [data-erro-foco="true"]')
}

defineExpose({ focarPrimeiroErro })
</script>

<template>
  <div
    ref="raiz"
    class="form-orcamento"
    :class="{ 'form-orcamento--compacto': compacto }"
  >
    <section
      class="secao"
      aria-labelledby="orc-identificacao"
    >
      <h3
        id="orc-identificacao"
        class="secao-titulo"
      >
        Identificação do Orçamento
      </h3>
      <dl
        v-if="$slots['identificacao-leitura']"
        class="leitura"
      >
        <slot name="identificacao-leitura" />
      </dl>
      <div class="grade">
        <CampoFormulario
          v-model="form.campos.titulo"
          class="grade-titulo"
          rotulo="Nome do Orçamento:"
          obrigatorio
          placeholder="Insira um título para o orçamento"
          autocomplete="off"
          :maxlength="180"
          :erro="form.erros.titulo"
        />
        <CampoFormulario
          :key="chaveSelectTipo"
          :model-value="form.campos.tipo"
          class="grade-tipo"
          rotulo="Tipo:"
          tipo="select"
          obrigatorio
          placeholder="Selecione o tipo de orçamento"
          :opcoes="OPCOES_TIPO_ORCAMENTO"
          :erro="form.erros.tipo"
          @update:model-value="escolherTipo"
        />
      </div>
    </section>

    <section
      class="secao"
      aria-labelledby="orc-cliente"
    >
      <h3
        id="orc-cliente"
        class="secao-titulo"
      >
        Cliente
      </h3>
      <OrcamentoCampoCliente
        :form="form"
        :compacto="compacto"
      />
    </section>

    <OrcamentoSecaoMateriais :form="form" />
    <OrcamentoSecaoServicos :form="form" />

    <p
      v-if="form.erros.itens"
      class="erro-itens"
      role="alert"
    >
      {{ form.erros.itens }}
    </p>

    <OrcamentoResumo
      :materiais="form.resumo.value.materiais"
      :servicos="form.resumo.value.servicos"
      :total="form.resumo.value.total"
      :acima-do-limite="form.resumo.value.acimaDoLimite"
    />

    <section class="secao secao--final">
      <CampoFormulario
        v-model="form.campos.prazo"
        class="campo-prazo"
        :rotulo="compacto ? 'Prazo estimado de entrega (dias):' : 'Prazo estimado de entrega:'"
        obrigatorio
        :dica="compacto ? undefined : '(em dias)'"
        placeholder="Ex: 15 dias"
        inputmode="numeric"
        autocomplete="off"
        :mascara="(valor: string) => valor.replace(/\D/g, '').slice(0, 4)"
        :erro="form.erros.prazo"
      />
      <CampoFormulario
        v-model="form.campos.observacoes"
        rotulo="Observações:"
        tipo="area"
        :linhas="compacto ? 3 : 4"
        placeholder="Digite observações adicionais sobre o orçamento (opcional)"
        :maxlength="3000"
        :erro="form.erros.observacoes"
      />
    </section>

    <p
      v-if="form.erroGeral.value"
      class="erro-geral"
      role="alert"
    >
      {{ form.erroGeral.value }}
    </p>

    <ModalDescartar
      :aberto="tipoPendente !== null"
      titulo="Trocar o tipo do orçamento?"
      :mensagem="mensagemTroca"
      texto-confirmar="Trocar tipo"
      texto-cancelar="Manter"
      @confirmar="confirmarTroca"
      @fechar="recusarTroca"
    />
  </div>
</template>

<style scoped>
.form-orcamento {
  --campo-altura: 40px;
  --orc-titulo-secao: 22px;

  display: flex;
  flex-direction: column;
  gap: 22px;
  /* A grade reage à largura do próprio formulário (modal, ou página com menu aberto em tela menor). */
  container-type: inline-size;
}

.form-orcamento--compacto {
  --orc-titulo-secao: 18px;
  --col-qtd: 100px;
  --col-valor: 118px;
  --col-total: 118px;
  --col-remover: 96px;

  gap: 18px;
}

.secao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.secao--final {
  gap: 16px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: var(--orc-titulo-secao);
  font-weight: 500;
}

.grade {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 12px 25px;
}

.grade-titulo {
  grid-column: span 7;
}

.grade-tipo {
  grid-column: span 5;
}

.leitura {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.campo-prazo {
  max-width: 334px;
}

.erro-itens,
.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

@container (max-width: 760px) {
  .grade-titulo,
  .grade-tipo {
    grid-column: 1 / -1;
  }

  .campo-prazo {
    max-width: none;
  }
}
</style>
