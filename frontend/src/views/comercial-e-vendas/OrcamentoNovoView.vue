<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import OrcamentoFormulario from '../../components/orcamentos/OrcamentoFormulario.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import ModalDescartar from '../../components/ui/ModalDescartar.vue'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import { useFormularioOrcamento } from '../../composables/useFormularioOrcamento'
import { useToast } from '../../composables/useToast'
import { criarOrcamento } from '../../services/orcamentos.service'
import { hojeIso } from '../../utils/datas'
import { isoParaDataBr } from '../../utils/formatadores'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioOrcamento()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

// O número só existe depois de salvar (o backend gera "0001", "0002"...): não há como prever sem arriscar mostrar um número errado.
const dataHoje = isoParaDataBr(hojeIso())

// Qualquer campo preenchido conta como cadastro em andamento (depois de salvar, não).
const preenchido = computed(() => !salvo.value && form.alterado.value)
const aviso = useAvisoAlteracoes(preenchido)

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarOrcamento(form.paraPayload())
    salvo.value = true
    mostrarToast('Salvo com sucesso!')
    await router.push({ name: 'orcamentos' })
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <section class="pagina">
    <div class="topo">
      <CabecalhoPagina
        titulo="Cadastrar Orçamento"
        subtitulo="Preencha os dados do novo orçamento"
      />
      <LinkVoltar :para="{ name: 'orcamentos' }" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <dl class="numero-data">
        <div>
          <dt>Nº Orçamento:</dt>
          <dd class="numero-futuro">
            Gerado ao salvar
          </dd>
        </div>
        <div>
          <dt>Data:</dt>
          <dd>{{ dataHoje }}</dd>
        </div>
      </dl>

      <OrcamentoFormulario
        ref="formulario"
        :form="form"
      />

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="router.push({ name: 'orcamentos' })"
        >
          Cancelar
        </BotaoFp>
        <BotaoFp
          type="submit"
          tamanho="formulario"
          :carregando="salvando"
        >
          Salvar
        </BotaoFp>
      </div>
    </form>

    <ModalDescartar
      :aberto="aviso.aberto.value"
      @confirmar="aviso.responder(true)"
      @fechar="aviso.responder(false)"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topo {
  display: flex;
  flex-direction: column;
  /* Figma: "Voltar" a ~28px do subtítulo. */
  gap: 28px;
}

.formulario {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 22px;
  margin-top: 8px;
}

/*
  Figma: "Nº Orçamento" e "Data" alinhados à direita, na mesma linha do título "Identificação do Orçamento"
  (primeira seção do formulário, que começa no topo). Saem do fluxo para ocupar essa linha.
*/
.numero-data {
  position: absolute;
  top: 4px;
  right: 0;
  display: flex;
  justify-content: flex-end;
  gap: 24px;
  margin: 0;
}

.numero-data div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.numero-data dt {
  color: #666;
  font-size: 15px;
  font-weight: 500;
}

.numero-data dd {
  margin: 0;
  color: var(--fp-verde);
  font-size: 17px;
  font-weight: 600;
}

.numero-futuro {
  font-size: 15px;
  font-weight: 500;
}

.rodape {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

/* Formulário estreito: o título e o bloco não cabem lado a lado, então o bloco volta ao fluxo, acima do título. */
@media (max-width: 900px) {
  .numero-data {
    position: static;
    justify-content: flex-start;
    margin-bottom: -8px;
  }
}
</style>
