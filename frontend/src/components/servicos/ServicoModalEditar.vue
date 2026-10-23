<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioServico } from '../../composables/useFormularioServico'
import { useToast } from '../../composables/useToast'
import { atualizarServico } from '../../services/servicos.service'
import type { Servico } from '../../types/servico'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ServicoFormulario from './ServicoFormulario.vue'

const props = defineProps<{ servico: Servico }>()

const emit = defineEmits<{
  fechar: []
  salvo: [servico: Servico]
}>()

const idFormulario = useId()
const formulario = useTemplateRef('formulario')
const form = useFormularioServico(props.servico)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)
const { mostrarToast } = useToast()

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (salvando.value) return
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
    emit('salvo', await atualizarServico(props.servico.id, form.paraAtualizacao()))
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
    titulo="Editar Serviço"
    icone="lapis"
    largura="620px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <ServicoFormulario
        ref="formulario"
        :form="form"
        compacto
      />
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
    mensagem="As alterações feitas neste serviço serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
