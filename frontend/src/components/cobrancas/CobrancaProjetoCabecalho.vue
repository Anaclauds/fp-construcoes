<script setup lang="ts">
import type { ProjetoCobrancas } from '../../types'
import { formatarMoeda } from '../../utils/formatadores'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import SeloTipoOrcamento from '../orcamentos/SeloTipoOrcamento.vue'
import SeloStatusCobranca from './SeloStatusCobranca.vue'

defineProps<{ projeto: ProjetoCobrancas }>()
</script>

<template>
  <header class="projeto">
    <div class="projeto-identificacao">
      <span class="projeto-numero">{{ formatarNumeroOrcamento(projeto.numero) }}</span>
      <div class="projeto-textos">
        <h2
          class="projeto-titulo"
          :title="projeto.titulo"
        >
          {{ projeto.titulo }}
        </h2>
        <p class="projeto-cliente">
          <span class="projeto-cliente-nome">Cliente: {{ projeto.cliente.nome }}</span>
          <SeloTipoOrcamento :tipo="projeto.tipo" />
        </p>
      </div>
    </div>

    <dl class="projeto-totais">
      <div>
        <dt>Total</dt>
        <dd>{{ formatarMoeda(projeto.valorTotal) }}</dd>
      </div>
      <div>
        <dt>Recebido</dt>
        <dd>{{ formatarMoeda(projeto.valorRecebido) }}</dd>
      </div>
      <div class="projeto-status">
        <dt class="fp-sr-only">
          Status
        </dt>
        <dd><SeloStatusCobranca :status="projeto.status" /></dd>
      </div>
    </dl>
  </header>
</template>

<style scoped>
.projeto {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 32px;
}

.projeto-identificacao {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.projeto-numero {
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid var(--fp-verde-30);
  border-radius: 8px;
  background-color: var(--fp-verde-10);

  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 600;
}

.projeto-textos {
  min-width: 0;
}

.projeto-titulo {
  margin: 0;
  overflow: hidden;
  color: #333;
  font-size: 18px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.projeto-cliente {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.projeto-cliente-nome {
  min-width: 0;
  overflow: hidden;
  color: #6a7282;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.projeto-totais {
  display: flex;
  align-items: center;
  gap: 28px;
  margin: 0;
}

.projeto-totais dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  text-align: right;
}

.projeto-totais dd {
  margin: 0;
  color: var(--fp-verde);
  font-size: 16px;
  font-weight: 600;
  text-align: right;
}

.projeto-status dd {
  font-size: 11px;
}
</style>
