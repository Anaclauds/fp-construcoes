<script setup lang="ts">
import logoFp from '../../assets/images/logo-fp.png'

export interface DadoCabecalho {
  rotulo: string
  valor: string
}

defineProps<{
  /** Título do documento ("Relatório de Frequência", "Orçamento #0001"). */
  titulo: string
  /** Pares rótulo/valor alinhados à direita (ex.: "Emitido em"). */
  dados: DadoCabecalho[]
  /** Versão da folha A4 impressa: logo e título menores. */
  impressao?: boolean
}>()
</script>

<template>
  <!-- Cabeçalho dos documentos A4 (relatório, orçamento): logo, empresa, título e dados de emissão. -->
  <header class="documento-topo">
    <div class="documento-marca">
      <img
        :src="logoFp"
        alt=""
        class="documento-logo"
        :class="{ 'documento-logo--impressao': impressao }"
      >
      <div>
        <p class="documento-empresa">
          FP Construções
        </p>
        <h1
          class="documento-titulo"
          :class="{ 'documento-titulo--impressao': impressao }"
        >
          {{ titulo }}
        </h1>
      </div>
    </div>
    <dl class="documento-emissao">
      <template
        v-for="dado in dados"
        :key="dado.rotulo"
      >
        <dt>{{ dado.rotulo }}</dt>
        <dd>{{ dado.valor }}</dd>
      </template>
    </dl>
  </header>
</template>

<style scoped>
p,
dl,
dd {
  margin: 0;
}

.documento-topo {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;

  padding-bottom: 16px;
  border-bottom: 2px solid var(--fp-verde);
}

.documento-marca {
  display: flex;
  align-items: center;
  gap: 14px;
}

.documento-logo {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.documento-logo--impressao {
  width: 48px;
  height: 48px;
}

.documento-empresa {
  color: var(--fp-verde);
  font-size: 13px;
  font-weight: 600;
}

.documento-titulo {
  margin: 0;
  color: #111;
  font-size: 22px;
  font-weight: 700;
}

.documento-titulo--impressao {
  font-size: 20px;
}

.documento-emissao {
  text-align: right;
}

.documento-emissao dt {
  color: #6b7280;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}

.documento-emissao dd {
  margin-bottom: 8px;
  color: #111;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 720px) {
  .documento-topo {
    flex-direction: column;
  }

  .documento-emissao {
    text-align: left;
  }
}
</style>
