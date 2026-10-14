<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import PaginaCadastroEstoque from '../../components/estoque/PaginaCadastroEstoque.vue'
import FornecedorFormulario from '../../components/fornecedores/FornecedorFormulario.vue'
import { useFormularioFornecedor } from '../../composables/useFormularioFornecedor'
import { useToast } from '../../composables/useToast'
import { criarFornecedor } from '../../services/fornecedores.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioFornecedor()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarFornecedor(form.paraPayload())
    salvo.value = true
    mostrarToast('Salvo com sucesso!')
    await router.push({ name: 'fornecedores' })
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
    titulo="Cadastrar Fornecedor"
    subtitulo="Preencha os dados abaixo para cadastrar um novo fornecedor"
    :voltar-para="{ name: 'fornecedores' }"
    :preenchido="form.alterado.value"
    :salvando="salvando"
    :salvo="salvo"
    @cancelar="router.push({ name: 'fornecedores' })"
    @salvar="salvar"
  >
    <FornecedorFormulario
      ref="formulario"
      :form="form"
    />
  </PaginaCadastroEstoque>
</template>
