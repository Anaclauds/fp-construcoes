<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import BotaoFp from '../ui/BotaoFp.vue'
import CabecalhoPagina from '../ui/CabecalhoPagina.vue'
import LinkVoltar from '../ui/LinkVoltar.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'

/**
 * Esqueleto das páginas de cadastro (material, equipamento, fornecedor): cabeçalho, "Voltar", formulário no corpo,
 * Cancelar/Salvar na base e aviso de descarte ao sair com dados preenchidos.
 */
const props = defineProps<{
  titulo: string
  subtitulo: string
  /** Lista para onde Voltar e Cancelar levam. */
  voltarPara: RouteLocationRaw
  /** Há algo preenchido (cadastro em andamento). */
  preenchido: boolean
  salvando: boolean
  /** Já salvou: a saída seguinte não pergunta mais. */
  salvo: boolean
}>()

const emit = defineEmits<{
  cancelar: []
  salvar: []
}>()

const sujo = computed(() => !props.salvo && props.preenchido)
const aviso = useAvisoAlteracoes(sujo)
</script>

<template>
  <section class="pagina">
    <div class="topo">
      <CabecalhoPagina
        :titulo="titulo"
        :subtitulo="subtitulo"
      />
      <LinkVoltar :para="voltarPara" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="emit('salvar')"
    >
      <slot />

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="emit('cancelar')"
        >
          Cancelar
        </BotaoFp>
        <BotaoFp
          type="submit"
          tamanho="formulario"
          :carregando="salvando"
        >
          Salvar
        </BotaoFp>
      </div>
    </form>

    <ModalDescartar
      :aberto="aviso.aberto.value"
      @confirmar="aviso.responder(true)"
      @fechar="aviso.responder(false)"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topo {
  display: flex;
  flex-direction: column;
  /* Figma: "Voltar" a ~28px do subtítulo. */
  gap: 28px;
}

.formulario {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 2px;
}

/* Figma: Cancelar e Salvar ficam na base da página. */
.rodape {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  margin-bottom: -13px;
}
</style>
