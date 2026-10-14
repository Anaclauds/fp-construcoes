<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import EquipamentoFormulario from '../../components/equipamentos/EquipamentoFormulario.vue'
import PaginaCadastroEstoque from '../../components/estoque/PaginaCadastroEstoque.vue'
import { useFormularioEquipamento } from '../../composables/useFormularioEquipamento'
import { useToast } from '../../composables/useToast'
import { criarEquipamento } from '../../services/equipamentos.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioEquipamento()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarEquipamento(form.paraPayload())
    salvo.value = true
    mostrarToast('Salvo com sucesso!')
    await router.push({ name: 'equipamentos' })
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <PaginaCadastroEstoque
    titulo="Cadastrar Equipamento"
    subtitulo="Preencha os dados abaixo para cadastrar um novo equipamento"
    :voltar-para="{ name: 'equipamentos' }"
    :preenchido="form.alterado.value"
    :salvando="salvando"
    :salvo="salvo"
    @cancelar="router.push({ name: 'equipamentos' })"
    @salvar="salvar"
  >
    <EquipamentoFormulario
      ref="formulario"
      :form="form"
    />
  </PaginaCadastroEstoque>
</template>
