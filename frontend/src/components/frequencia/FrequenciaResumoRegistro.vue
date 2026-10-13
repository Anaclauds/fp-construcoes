<script setup lang="ts">
import { rotuloLegivel } from '../../utils/formatadores'
import { classeStatus, rotuloStatus, type LinhaFolha } from '../../utils/frequencia'

defineProps<{ linha: LinhaFolha }>()
</script>

<template>
  <div class="resumo-funcionario">
    <strong class="resumo-nome">{{ linha.nome }}</strong>
    <span class="resumo-funcao">{{ rotuloLegivel(linha.funcao) }}</span>
  </div>

  <section
    class="resumo-status"
    :class="classeStatus(linha.status)"
  >
    <span
      class="resumo-status-ponto"
      aria-hidden="true"
    />
    <div>
      <p
        v-if="linha.status"
        class="resumo-status-rotulo"
      >
        Status registrado
      </p>
      <p class="resumo-status-valor">
        {{ linha.status ? rotuloStatus(linha.status) : 'Frequência não registrada!' }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.resumo-funcionario {
  display: flex;
  flex-direction: column;
}

.resumo-nome {
  color: var(--fp-verde);
  font-size: 17px;
  font-weight: 600;
}

.resumo-funcao {
  color: #666;
  font-size: 13px;
}

.resumo-status {
  display: flex;
  align-items: center;
  gap: 14px;

  margin: 18px 0 20px;
  padding: 14px 17px;
  border: 1px solid var(--st-borda);
  border-radius: var(--fp-raio);
  background-color: var(--st-fundo);
}

.resumo-status-ponto {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background-color: var(--st-texto);
}

.resumo-status p {
  margin: 0;
}

.resumo-status-rotulo {
  color: #6b7280;
  font-size: 12px;
}

.resumo-status-valor {
  color: var(--st-texto);
  font-size: 15px;
  font-weight: 600;
}
</style>
