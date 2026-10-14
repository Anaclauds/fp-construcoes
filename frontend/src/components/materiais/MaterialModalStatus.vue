<script setup lang="ts">
import { desativarMaterial, reativarMaterial } from '../../services/materiais.service'
import type { Material } from '../../types/material'
import { mensagemMaterial } from '../../utils/materiais'
import ModalStatusCadastro from '../estoque/ModalStatusCadastro.vue'

const props = defineProps<{
  material: Material
  acao: 'desativar' | 'reativar'
}>()

const emit = defineEmits<{
  fechar: []
  concluido: [acao: 'desativar' | 'reativar']
}>()

const executar = () => (props.acao === 'desativar' ? desativarMaterial(props.material.id) : reativarMaterial(props.material.id))
</script>

<template>
  <ModalStatusCadastro
    entidade="Material"
    :acao="acao"
    :executar="executar"
    :mapear-erro="mensagemMaterial"
    @fechar="emit('fechar')"
    @concluido="emit('concluido', $event)"
  >
    <template #desativar>
      O material <strong>{{ material.nome }}</strong> será marcado como inativo, deixará de aparecer no estoque e
      não poderá ser escolhido em novos orçamentos nem em compras. Orçamentos e projetos já existentes não são
      alterados, e o material pode ser reativado a qualquer momento.
    </template>
    <template #reativar>
      O material <strong>{{ material.nome }}</strong> será marcado como ativo e voltará ao estoque e às listas de
      materiais de orçamentos e compras.
    </template>
  </ModalStatusCadastro>
</template>
