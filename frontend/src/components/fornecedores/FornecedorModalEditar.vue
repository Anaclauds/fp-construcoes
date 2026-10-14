<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useFormularioFornecedor } from '../../composables/useFormularioFornecedor'
import { useToast } from '../../composables/useToast'
import { atualizarFornecedor } from '../../services/fornecedores.service'
import type { Fornecedor } from '../../types/fornecedor'
import ModalEdicaoCadastro from '../estoque/ModalEdicaoCadastro.vue'
import FornecedorFormulario from './FornecedorFormulario.vue'

const props = defineProps<{ fornecedor: Fornecedor }>()

const emit = defineEmits<{
  fechar: []
  salvo: [fornecedor: Fornecedor]
}>()

const formulario = useTemplateRef('formulario')
const form = useFormularioFornecedor(props.fornecedor)
const salvando = shallowRef(false)
const { mostrarToast } = useToast()

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
    emit('salvo', await atualizarFornecedor(props.fornecedor.id, form.paraAtualizacao()))
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalEdicaoCadastro
    titulo="Editar Fornecedor"
    largura="780px"
    :alterado="form.alterado.value"
    :salvando="salvando"
    mensagem-descartar="As alterações feitas neste fornecedor serão perdidas."
    @fechar="emit('fechar')"
    @salvar="salvar"
  >
    <FornecedorFormulario
      ref="formulario"
      :form="form"
      compacto
    />
  </ModalEdicaoCadastro>
</template>
