<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'
import type { MaterialSemSaldo } from '../../services/api'

const props = defineProps<{
  mensagem: string
  /** Falta de saldo no estoque: mostra atalhos (nova aba) para onde resolver sem perder o que foi preenchido. */
  estoque?: boolean
  /** Materiais sem saldo (necessário x disponível), quando o servidor os detalha. */
  materiais?: MaterialSemSaldo[]
  /** Moldura de alerta amarela (aviso antes de agir) em vez da vermelha de erro. */
  atencao?: boolean
}>()

const numero = (valor: number) => valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

const router = useRouter()
const { temPermissao } = useAuth()

const atalhos = computed(() => {
  if (!props.estoque) return []
  const lista: { rotulo: string; href: string }[] = []
  if (temPermissao('ESTOQUE', 'visualizar')) lista.push({ rotulo: 'Abrir Estoque', href: router.resolve({ name: 'estoque' }).href })
  if (temPermissao('DESPESAS', 'visualizar')) lista.push({ rotulo: 'Abrir Despesas (compras)', href: router.resolve({ name: 'despesas' }).href })
  return lista
})
</script>

<template>
  <div
    class="aviso-erro"
    :class="{ 'aviso-erro--atencao': atencao }"
    role="alert"
  >
    <p class="aviso-erro-texto">
      {{ mensagem }}
    </p>
    <table
      v-if="materiais && materiais.length > 0"
      class="aviso-erro-materiais"
    >
      <caption class="fp-sr-only">
        Materiais sem saldo suficiente
      </caption>
      <thead>
        <tr>
          <th scope="col">
            Material
          </th>
          <th scope="col">
            Necessário
          </th>
          <th scope="col">
            Disponível
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="material in materiais"
          :key="material.id"
        >
          <td>{{ material.nome }}</td>
          <td>{{ numero(material.necessario) }}</td>
          <td>{{ numero(material.disponivel) }}</td>
        </tr>
      </tbody>
    </table>
    <p
      v-if="atalhos.length > 0"
      class="aviso-erro-atalhos"
    >
      <a
        v-for="atalho in atalhos"
        :key="atalho.href"
        :href="atalho.href"
        target="_blank"
        rel="noopener"
      >{{ atalho.rotulo }}</a>
      <span>(abre em nova aba; o que você preencheu aqui é mantido)</span>
    </p>
  </div>
</template>

<style scoped>
.aviso-erro.aviso-erro--atencao {
  border-color: #fcd34d;
  background-color: #fffbeb;
  color: #92400e;
}

.aviso-erro.aviso-erro--atencao .aviso-erro-atalhos a {
  color: #92400e;
}

.aviso-erro-materiais {
  width: 100%;
  margin-top: 8px;
  border-collapse: collapse;
  font-size: 13px;
  font-weight: 400;
}

.aviso-erro-materiais th,
.aviso-erro-materiais td {
  padding: 4px 8px;
  border-top: 1px solid currentColor;
  text-align: left;
}

.aviso-erro-materiais th:not(:first-child),
.aviso-erro-materiais td:not(:first-child) {
  text-align: right;
  white-space: nowrap;
}

.aviso-erro {
  padding: 10px 14px;
  border: 1px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;

  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.aviso-erro-texto {
  margin: 0;
}

.aviso-erro-atalhos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  margin: 6px 0 0;
  font-size: 13px;
}

.aviso-erro-atalhos a {
  color: var(--fp-vermelho-escuro);
  font-weight: 600;
  text-decoration: underline;
}

.aviso-erro-atalhos span {
  color: #6a7282;
  font-weight: 400;
}
</style>
