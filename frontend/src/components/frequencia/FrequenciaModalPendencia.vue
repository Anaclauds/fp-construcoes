<script setup lang="ts">
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'

defineProps<{
  /** Nomes dos funcionários com status que exige observação, mas sem ela. */
  nomes: string[]
}>()

const emit = defineEmits<{ fechar: [] }>()
</script>

<template>
  <ModalBase
    aberto
    titulo="Justificativa Pendente"
    subtitulo="Preencha antes de salvar"
    variante="aviso"
    icone="alerta"
    largura="460px"
    @fechar="emit('fechar')"
  >
    <p class="pendencia-texto">
      Os seguintes funcionários estão com status que exige observação (Meio Período ou Falta
      Justificada), mas ela não foi preenchida:
    </p>

    <ul class="pendencia-lista">
      <li
        v-for="nome in nomes"
        :key="nome"
      >
        {{ nome }}
      </li>
    </ul>

    <p class="pendencia-dica">
      Clique no ícone de edição ao lado de cada funcionário para informar o motivo.
    </p>

    <template #rodape>
      <BotaoFp @click="emit('fechar')">
        Entendido
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.pendencia-texto {
  margin: 0 0 14px;
  color: var(--fp-texto-corpo);
  font-size: 14px;
  line-height: 1.45;
}

.pendencia-lista {
  max-height: 180px;
  margin: 0 0 14px;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.pendencia-lista li {
  display: flex;
  align-items: center;
  gap: 10px;

  padding: 10px 15px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;

  color: #92400e;
  font-size: 14px;
  font-weight: 600;
}

.pendencia-lista li + li {
  margin-top: 6px;
}

.pendencia-lista li::before {
  content: '';
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: #d97706;
}

.pendencia-dica {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.45;
}
</style>
