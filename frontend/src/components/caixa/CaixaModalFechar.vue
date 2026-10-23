<script setup lang="ts">
import { computed } from 'vue'
import { useAcoesCaixa } from '../../composables/useAcoesCaixa'
import type { Caixa } from '../../types/caixa'
import { competenciaDoCaixa, nomeDoMes } from '../../utils/caixa'
import { formatarMoeda } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'

const props = defineProps<{ caixa: Caixa }>()

const emit = defineEmits<{
  fechar: []
  fechado: [caixa: Caixa]
  /** O caixa já mudou em outra tela (já fechado/aberto): quem usa recarrega o caixa. */
  desatualizado: []
}>()

const acoes = useAcoesCaixa()

const competencia = computed(() => competenciaDoCaixa(props.caixa))
const ano = computed(() => competencia.value.slice(0, 4))

async function confirmar() {
  const resultado = await acoes.fechar(props.caixa.id)
  if (resultado) emit('fechado', resultado)
  else if (acoes.desatualizado.value) emit('desatualizado')
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Fechar Caixa"
    :subtitulo="`${nomeDoMes(competencia)} ${ano}`"
    icone="cadeado"
    largura="480px"
    :bloqueado="acoes.executando.value"
    @fechar="emit('fechar')"
  >
    <dl class="linhas">
      <div class="linha">
        <dt>Mês de fechamento:</dt>
        <dd>{{ nomeDoMes(competencia) }}</dd>
      </div>
      <div class="linha">
        <dt>Valor Inicial</dt>
        <dd>{{ formatarMoeda(caixa.resumo.valorInicial) }}</dd>
      </div>
      <div class="linha">
        <dt>Total Entradas</dt>
        <dd class="entrada">
          {{ formatarMoeda(caixa.resumo.totalEntradas) }}
        </dd>
      </div>
      <div class="linha">
        <dt>Total Saídas</dt>
        <dd class="saida">
          {{ formatarMoeda(caixa.resumo.totalSaidas) }}
        </dd>
      </div>
      <div class="linha linha--saldo">
        <dt>Saldo final</dt>
        <dd>{{ formatarMoeda(caixa.resumo.saldoAtual) }}</dd>
      </div>
    </dl>

    <p class="aviso">
      Ao fechar, nenhum lançamento poderá ser adicionado ou alterado neste mês. Confira os valores antes de confirmar.
    </p>

    <p
      v-if="acoes.erro.value"
      class="erro"
      role="alert"
    >
      {{ acoes.erro.value }}
    </p>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="acoes.executando.value"
        @click="emit('fechar')"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        :carregando="acoes.executando.value"
        @click="confirmar"
      >
        Confirmar Fechamento
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.linhas {
  margin: 0;
}

.linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid #f0f1f3;
}

.linha dt {
  color: var(--fp-cinza-rotulo);
  font-size: 14px;
  font-weight: 500;
}

.linha dd {
  margin: 0;
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.entrada {
  color: #008236;
}

.saida {
  color: var(--fp-vermelho-escuro);
}

.linha--saldo {
  border-bottom: 0;
}

.linha--saldo dt {
  color: var(--fp-texto-titulo-campo);
  font-weight: 600;
}

.linha--saldo dd {
  color: var(--fp-verde);
  font-size: 18px;
}

.aviso {
  margin: 12px 0 0;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;
  color: #b45309;
  font-size: 13px;
}

.erro {
  margin: 12px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}
</style>
