<script setup lang="ts">
export interface AssinaturaDocumento {
  nome: string
  /** "Funcionário", "Cliente"... */
  papel: string
}

defineProps<{ assinaturas: AssinaturaDocumento[]; impressao?: boolean }>()
</script>

<template>
  <!-- Linhas de assinatura dos documentos A4, lado a lado. -->
  <section
    class="documento-assinaturas"
    :class="{ 'documento-assinaturas--impressao': impressao }"
  >
    <div
      v-for="assinatura in assinaturas"
      :key="assinatura.papel"
      class="documento-assinatura"
    >
      <span class="documento-assinatura-linha" />
      <strong>{{ assinatura.nome }}</strong>
      <span>{{ assinatura.papel }}</span>
      <span class="documento-assinatura-data">Data: ______ / ______ / __________</span>
    </div>
  </section>
</template>

<style scoped>
.documento-assinaturas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 56px;

  margin-top: 40px;
  break-inside: avoid;
}

.documento-assinaturas--impressao {
  margin-top: 30px;
}

.documento-assinatura {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  color: #4a5565;
  font-size: 12px;
  text-align: center;
}

.documento-assinatura strong {
  color: #111;
  font-size: 13px;
}

.documento-assinatura-linha {
  width: 100%;
  margin-bottom: 6px;
  border-top: 1px solid #333;
}

.documento-assinatura-data {
  margin-top: 8px;
  color: #6b7280;
}
</style>
