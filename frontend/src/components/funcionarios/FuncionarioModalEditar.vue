<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import FuncionarioFormulario from './FuncionarioFormulario.vue'
import { useFormularioFuncionario } from '../../composables/useFormularioFuncionario'
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

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  const alteracoes = form.paraAtualizacao()
  // Nada mudou: não há o que enviar.
  if (Object.keys(alteracoes).length === 0) {
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
    @fechar="emit('fechar')"
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
        @click="emit('fechar')"
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
</template>
