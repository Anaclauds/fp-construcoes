<script setup lang="ts">
import { desativarEquipamento, reativarEquipamento } from '../../services/equipamentos.service'
import type { Equipamento } from '../../types/equipamento'
import { mensagemEquipamento } from '../../utils/equipamentos'
import ModalStatusCadastro from '../estoque/ModalStatusCadastro.vue'

const props = defineProps<{
  equipamento: Equipamento
  acao: 'desativar' | 'reativar'
}>()

const emit = defineEmits<{
  fechar: []
  concluido: [acao: 'desativar' | 'reativar']
}>()

const executar = () =>
  props.acao === 'desativar' ? desativarEquipamento(props.equipamento.id) : reativarEquipamento(props.equipamento.id)
</script>

<template>
  <ModalStatusCadastro
    entidade="Equipamento"
    :acao="acao"
    :executar="executar"
    :mapear-erro="mensagemEquipamento"
    @fechar="emit('fechar')"
    @concluido="emit('concluido', $event)"
  >
    <template #desativar>
      O equipamento <strong>{{ equipamento.nome }}</strong> ({{ equipamento.codigoPatrimonial }}) será marcado
      como inativo e deixará de aparecer na lista de equipamentos ativos. O cadastro é mantido e o equipamento pode
      ser reativado a qualquer momento.
    </template>
    <template #reativar>
      O equipamento <strong>{{ equipamento.nome }}</strong> ({{ equipamento.codigoPatrimonial }}) será marcado
      como ativo e voltará à lista de equipamentos ativos.
    </template>
  </ModalStatusCadastro>
</template>
