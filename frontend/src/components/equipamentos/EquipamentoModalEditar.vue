<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useFormularioEquipamento } from '../../composables/useFormularioEquipamento'
import { useToast } from '../../composables/useToast'
import { atualizarEquipamento } from '../../services/equipamentos.service'
import type { Equipamento } from '../../types/equipamento'
import ModalEdicaoCadastro from '../estoque/ModalEdicaoCadastro.vue'
import EquipamentoFormulario from './EquipamentoFormulario.vue'

const props = defineProps<{ equipamento: Equipamento }>()

const emit = defineEmits<{
  fechar: []
  salvo: [equipamento: Equipamento]
}>()

const formulario = useTemplateRef('formulario')
const form = useFormularioEquipamento(props.equipamento)
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
    emit('salvo', await atualizarEquipamento(props.equipamento.id, form.paraAtualizacao()))
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
    titulo="Editar Equipamento"
    largura="760px"
    :alterado="form.alterado.value"
    :salvando="salvando"
    mensagem-descartar="As alterações feitas neste equipamento serão perdidas."
    @fechar="emit('fechar')"
    @salvar="salvar"
  >
    <EquipamentoFormulario
      ref="formulario"
      :form="form"
      :codigo="equipamento.codigoPatrimonial"
      compacto
    />
  </ModalEdicaoCadastro>
</template>
