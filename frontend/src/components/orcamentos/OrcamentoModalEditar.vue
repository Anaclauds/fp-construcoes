<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioOrcamento } from '../../composables/useFormularioOrcamento'
import { useToast } from '../../composables/useToast'
import { atualizarOrcamento } from '../../services/orcamentos.service'
import type { Orcamento } from '../../types'
import { isoParaDataBr } from '../../utils/formatadores'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import OrcamentoFormulario from './OrcamentoFormulario.vue'

const props = defineProps<{ orcamento: Orcamento }>()

const emit = defineEmits<{
  fechar: []
  salvo: [orcamento: Orcamento]
}>()

const idFormulario = useId()
const formulario = useTemplateRef('formulario')
const form = useFormularioOrcamento(props.orcamento)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)
const { mostrarToast } = useToast()

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  // Nada mudou: não há o que enviar.
  if (!form.alterado.value) {
    mostrarToast('Nenhuma alteração para salvar.', 'info')
    emit('fechar')
    return
  }

  salvando.value = true
  try {
    const atualizado = await atualizarOrcamento(props.orcamento.id, form.paraAtualizacao())
    emit('salvo', atualizado)
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Editar Orçamento"
    icone="lapis"
    largura="940px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <OrcamentoFormulario
        ref="formulario"
        :form="form"
        compacto
      >
        <template #identificacao-leitura>
          <CampoLeitura
            rotulo="Código do Orçamento"
            :valor="formatarNumeroOrcamento(orcamento.numero)"
          />
          <CampoLeitura
            rotulo="Data do Orçamento"
            :valor="isoParaDataBr(orcamento.dataEmissao)"
          />
        </template>
      </OrcamentoFormulario>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
      >
        Salvar Alterações
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    mensagem="As alterações feitas neste orçamento serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
