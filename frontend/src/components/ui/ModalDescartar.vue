<script setup lang="ts">
import ModalConfirmacao from './ModalConfirmacao.vue'

withDefaults(
  defineProps<{
    aberto: boolean
    titulo?: string
    mensagem?: string
    textoConfirmar?: string
    textoCancelar?: string
  }>(),
  {
    titulo: 'Descartar cadastro?',
    mensagem: 'Os dados preenchidos serão perdidos.',
    textoConfirmar: 'Descartar',
    textoCancelar: 'Continuar editando',
  },
)

defineEmits<{
  /** Quer descartar e sair. */
  confirmar: []
  /** Quer continuar editando. */
  fechar: []
}>()
</script>

<template>
  <!-- Pergunta vazia: o título já é a pergunta. -->
  <ModalConfirmacao
    :aberto="aberto"
    :titulo="titulo"
    :texto-confirmar="textoConfirmar"
    :texto-cancelar="textoCancelar"
    pergunta=""
    @confirmar="$emit('confirmar')"
    @fechar="$emit('fechar')"
  >
    {{ mensagem }}
  </ModalConfirmacao>
</template>
