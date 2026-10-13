<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ClienteFormulario from './ClienteFormulario.vue'
import { useFormularioCliente } from '../../composables/useFormularioCliente'
import { useToast } from '../../composables/useToast'
import { atualizarCliente } from '../../services/clientes.service'
import type { Cliente } from '../../types'

const props = defineProps<{ cliente: Cliente }>()

const emit = defineEmits<{
  fechar: []
  salvo: [cliente: Cliente]
}>()

const idFormulario = useId()
const formulario = useTemplateRef('formulario')
const form = useFormularioCliente(props.cliente)
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
    // O backend revalida o cadastro inteiro: vai o objeto completo do tipo, não só o que mudou.
    const atualizado = await atualizarCliente(props.cliente.id, form.paraAtualizacao())
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
    titulo="Editar Cliente"
    icone="lapis"
    largura="720px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <ClienteFormulario
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
    mensagem="As alterações feitas neste cliente serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
