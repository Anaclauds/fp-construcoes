<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'

/**
 * Casca dos modais "Editar ..." (material, equipamento, fornecedor): cabeçalho, formulário no corpo,
 * Cancelar / Salvar Alterações e confirmação de descarte quando há alterações.
 */
const props = defineProps<{
  titulo: string
  largura: string
  /** Há alterações em relação ao cadastro aberto. */
  alterado: boolean
  salvando: boolean
  mensagemDescartar: string
}>()

const emit = defineEmits<{
  fechar: []
  salvar: []
}>()

const idFormulario = useId()
const confirmandoSaida = shallowRef(false)

/** X, Esc, clique fora e Cancelar: com alterações pergunta antes de descartar. */
function pedirFechar() {
  if (props.alterado) confirmandoSaida.value = true
  else emit('fechar')
}
</script>

<template>
  <ModalBase
    aberto
    :titulo="titulo"
    icone="lapis"
    :largura="largura"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="emit('salvar')"
    >
      <slot />
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
      >
        Salvar Alterações
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    :mensagem="mensagemDescartar"
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>
