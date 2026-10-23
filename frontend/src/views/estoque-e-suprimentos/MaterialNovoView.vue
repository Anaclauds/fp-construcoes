<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import PaginaCadastroEstoque from '../../components/estoque/PaginaCadastroEstoque.vue'
import MaterialFormulario from '../../components/materiais/MaterialFormulario.vue'
import { useFormularioMaterial } from '../../composables/useFormularioMaterial'
import { useToast } from '../../composables/useToast'
import { criarMaterial } from '../../services/materiais.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioMaterial()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarMaterial(form.paraPayload())
    salvo.value = true
    mostrarToast('Material cadastrado!')
    await router.push({ name: 'materiais' })
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
    titulo="Cadastrar Material"
    subtitulo="Preencha os dados abaixo para cadastrar um novo material"
    :voltar-para="{ name: 'materiais' }"
    :preenchido="form.alterado.value"
    :salvando="salvando"
    :salvo="salvo"
    @cancelar="router.push({ name: 'materiais' })"
    @salvar="salvar"
  >
    <MaterialFormulario
      ref="formulario"
      :form="form"
    />
  </PaginaCadastroEstoque>
</template>
