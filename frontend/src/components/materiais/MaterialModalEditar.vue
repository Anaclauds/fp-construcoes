<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useFormularioMaterial } from '../../composables/useFormularioMaterial'
import { useToast } from '../../composables/useToast'
import { atualizarMaterial } from '../../services/materiais.service'
import type { Material } from '../../types/material'
import ModalEdicaoCadastro from '../estoque/ModalEdicaoCadastro.vue'
import MaterialFormulario from './MaterialFormulario.vue'

const props = defineProps<{ material: Material }>()

const emit = defineEmits<{
  fechar: []
  salvo: [material: Material]
}>()

const formulario = useTemplateRef('formulario')
const form = useFormularioMaterial(props.material)
const salvando = shallowRef(false)
const { mostrarToast } = useToast()

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
    emit('salvo', await atualizarMaterial(props.material.id, form.paraAtualizacao()))
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
    titulo="Editar Material"
    largura="700px"
    :alterado="form.alterado.value"
    :salvando="salvando"
    mensagem-descartar="As alterações feitas neste material serão perdidas."
    @fechar="emit('fechar')"
    @salvar="salvar"
  >
    <MaterialFormulario
      ref="formulario"
      :form="form"
      :codigo="material.codigo"
      compacto
    />
  </ModalEdicaoCadastro>
</template>
