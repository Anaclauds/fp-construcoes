<script setup lang="ts">
import { useRouter } from 'vue-router'
import BotaoFp from '../../components/ui/BotaoFp.vue'

const router = useRouter()
</script>

<template>
  <section class="nao-encontrado">
    <h1>Página não encontrada</h1>
    <p>O endereço que você acessou não existe ou foi removido.</p>
    <BotaoFp
      tamanho="pagina"
      @click="router.push({ name: 'home' })"
    >
      Voltar ao início
    </BotaoFp>
  </section>
</template>

<style scoped>
.nao-encontrado {
  flex: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;

  text-align: center;
}

h1 {
  margin: 0;
  color: var(--fp-verde);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.15;
}

p {
  margin: 0 0 12px;
  color: #666;
  font-size: 16px;
  font-weight: 500;
}
</style>
