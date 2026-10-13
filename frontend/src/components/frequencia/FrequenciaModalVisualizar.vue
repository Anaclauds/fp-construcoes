<script setup lang="ts">
import { computed } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import FrequenciaResumoRegistro from './FrequenciaResumoRegistro.vue'
import { diaDaSemana } from '../../utils/datas'
import { isoParaDataBr } from '../../utils/formatadores'
import type { LinhaFolha } from '../../utils/frequencia'

const props = defineProps<{
  /** Data do registro (YYYY-MM-DD). */
  data: string
  linha: LinhaFolha
}>()

const emit = defineEmits<{ fechar: [] }>()

const subtitulo = computed(() => `${isoParaDataBr(props.data)} · ${diaDaSemana(props.data)}`)
</script>

<template>
  <ModalBase
    aberto
    titulo="Visualizar Registro"
    :subtitulo="subtitulo"
    icone="olho"
    largura="520px"
    @fechar="emit('fechar')"
  >
    <FrequenciaResumoRegistro :linha="linha" />

    <section>
      <h3 class="registro-rotulo">
        Observação
      </h3>
      <p
        class="registro-observacao"
        :class="{ 'registro-observacao--vazia': !linha.observacao }"
      >
        {{ linha.observacao || 'Nenhuma observação registrada.' }}
      </p>
    </section>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        @click="emit('fechar')"
      >
        Fechar
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.registro-rotulo {
  margin: 0 0 8px;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
}

.registro-observacao {
  min-height: 52px;
  margin: 0;
  padding: 14px 16px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);

  color: #333;
  font-size: 14px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.registro-observacao--vazia {
  color: var(--fp-cinza-rotulo);
}
</style>
