<script setup lang="ts">
defineProps<{
  titulo: string
  subtitulo?: string
}>()
</script>

<template>
  <header class="cabecalho-pagina">
    <div class="cabecalho-pagina-texto">
      <h1>{{ titulo }}</h1>
      <p v-if="subtitulo">
        {{ subtitulo }}
      </p>
    </div>

    <!-- Ação principal da página (ex.: "+ Novo Usuário"). -->
    <div
      v-if="$slots.acao"
      class="cabecalho-pagina-acao"
    >
      <slot name="acao" />
    </div>
  </header>
</template>

<style scoped>
.cabecalho-pagina {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.cabecalho-pagina-texto {
  min-width: 0;
}

h1 {
  margin: 0;
  color: var(--fp-verde);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.15;
}

p {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

/* Reserva o espaço do logo fixo no canto superior direito (83px + respiro). */
.cabecalho-pagina-acao {
  flex-shrink: 0;
  margin-right: 90px;
  /* No Figma o botão desce um pouco abaixo da linha do subtítulo. */
  position: relative;
  top: 20px;
}

@media (max-width: 900px) {
  h1 {
    font-size: 28px;
  }
}
</style>
