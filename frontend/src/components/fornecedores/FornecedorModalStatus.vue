<script setup lang="ts">
import { desativarFornecedor, reativarFornecedor } from '../../services/fornecedores.service'
import type { Fornecedor } from '../../types/fornecedor'
import { mensagemFornecedor } from '../../utils/fornecedores'
import ModalStatusCadastro from '../estoque/ModalStatusCadastro.vue'

const props = defineProps<{
  fornecedor: Fornecedor
  acao: 'desativar' | 'reativar'
}>()

const emit = defineEmits<{
  fechar: []
  concluido: [acao: 'desativar' | 'reativar']
}>()

const executar = () =>
  props.acao === 'desativar' ? desativarFornecedor(props.fornecedor.id) : reativarFornecedor(props.fornecedor.id)
</script>

<template>
  <ModalStatusCadastro
    entidade="Fornecedor"
    :acao="acao"
    :executar="executar"
    :mapear-erro="mensagemFornecedor"
    @fechar="emit('fechar')"
    @concluido="emit('concluido', $event)"
  >
    <template #desativar>
      O fornecedor <strong>{{ fornecedor.nomeFantasia }}</strong> será marcado como inativo e não poderá ser
      escolhido em novos cadastros de materiais, equipamentos ou compras. Materiais e equipamentos que já o usam
      continuam cadastrados, e o fornecedor pode ser reativado a qualquer momento.
    </template>
    <template #reativar>
      O fornecedor <strong>{{ fornecedor.nomeFantasia }}</strong> será marcado como ativo e poderá voltar a ser
      escolhido em materiais, equipamentos e compras.
    </template>
  </ModalStatusCadastro>
</template>
