<script setup lang="ts">
import { computed } from 'vue'
import BotaoFp from './BotaoFp.vue'
import ModalBase from './ModalBase.vue'

const props = withDefaults(
  defineProps<{
    aberto: boolean
    titulo: string
    subtitulo?: string
    /** perigo: cabeçalho vermelho (desativar); sucesso: cabeçalho verde (ativar). */
    variante?: 'perigo' | 'sucesso'
    textoConfirmar: string
    textoCancelar?: string
    /** Título em destaque dentro da caixa de aviso (ex.: "Atenção"). */
    tituloAviso?: string
    pergunta?: string
    carregando?: boolean
    /** Erro devolvido pela API ao confirmar. */
    erro?: string | null
  }>(),
  { variante: 'perigo', textoCancelar: 'Cancelar', pergunta: 'Deseja continuar?', carregando: false, erro: null },
)

const emit = defineEmits<{
  confirmar: []
  fechar: []
}>()

const perigo = computed(() => props.variante === 'perigo')
</script>

<template>
  <ModalBase
    :aberto="aberto"
    :titulo="titulo"
    :subtitulo="subtitulo"
    :variante="perigo ? 'vermelho' : 'verde'"
    :icone="perigo ? 'x' : 'check'"
    largura="520px"
    :bloqueado="carregando"
    @fechar="emit('fechar')"
  >
    <div
      class="confirmacao-aviso"
      :class="{ 'confirmacao-aviso--sucesso': !perigo }"
    >
      <strong
        v-if="tituloAviso"
        class="confirmacao-titulo"
      >{{ tituloAviso }}</strong>
      <slot />
    </div>

    <p class="confirmacao-pergunta">
      {{ pergunta }}
    </p>

    <p
      v-if="erro"
      class="confirmacao-erro"
      role="alert"
    >
      {{ erro }}
    </p>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="carregando"
        @click="emit('fechar')"
      >
        {{ textoCancelar }}
      </BotaoFp>
      <BotaoFp
        :variante="perigo ? 'perigo-suave' : 'primario'"
        :carregando="carregando"
        @click="emit('confirmar')"
      >
        {{ textoConfirmar }}
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.confirmacao-aviso {
  padding: 14px 18px;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  background-color: #fef2f2;

  color: var(--fp-vermelho-escuro);
  font-size: 15px;
  line-height: 1.45;
}

.confirmacao-titulo {
  display: block;
  margin-bottom: 4px;
  font-weight: 600;
}

.confirmacao-aviso--sucesso {
  border-color: #86efac;
  background-color: #f0fdf4;
  color: #166534;
}

.confirmacao-pergunta {
  margin: 18px 0 0;
  color: var(--fp-texto-corpo);
  font-size: 15px;
}

.confirmacao-erro {
  margin: 14px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
