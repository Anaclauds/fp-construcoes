<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import FuncionarioFormulario from './FuncionarioFormulario.vue'
import { useFormularioFuncionario } from '../../composables/useFormularioFuncionario'
import { useToast } from '../../composables/useToast'
import { atualizarFuncionario } from '../../services/funcionarios.service'
import type { Funcionario } from '../../types'

const props = defineProps<{ funcionario: Funcionario }>()

const emit = defineEmits<{
  fechar: []
  salvo: []
}>()

const idFormulario = useId()
const formulario = useTemplateRef('formulario')
const form = useFormularioFuncionario(props.funcionario)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)
const { mostrarToast } = useToast()

// Só o que difere do funcionário carregado conta como alteração.
const alterado = computed(() => Object.keys(form.paraAtualizacao()).length > 0)

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  const alteracoes = form.paraAtualizacao()
  // Nada mudou: não há o que enviar.
  if (Object.keys(alteracoes).length === 0) {
    mostrarToast('Nenhuma alteração para salvar.', 'info')
    emit('fechar')
    return
  }

  salvando.value = true
  try {
    await atualizarFuncionario(props.funcionario.id, alteracoes)
    emit('salvo')
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
    titulo="Editar Funcionário"
    icone="lapis"
    largura="800px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <FuncionarioFormulario
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
    mensagem="As alterações feitas neste funcionário serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
