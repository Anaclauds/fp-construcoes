<script setup lang="ts">
import { computed } from 'vue'
import { useCobrancaDetalhe } from '../../composables/useCobrancaDetalhe'
import type { Cobranca } from '../../types'
import {
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_STATUS_COBRANCA,
  ROTULO_TIPO_COBRANCA,
  nomeDeQuemRegistrou,
  parcelaDeReferencia,
  descricaoCobranca,
} from '../../utils/cobrancas'
import { formatarMoeda, instanteParaDataBr, isoParaDataBr } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import CobrancaParcelas from './CobrancaParcelas.vue'
import SeloStatusCobranca from './SeloStatusCobranca.vue'

const props = defineProps<{
  /** Cobrança como veio do detalhe do projeto: já preenche o resumo enquanto o histórico completo carrega. */
  cobranca: Cobranca
}>()

defineEmits<{ fechar: [] }>()

const detalhe = useCobrancaDetalhe(props.cobranca.id)

// Mostra o que já se sabe e troca pelos dados completos (com quem registrou) assim que chegam.
const atual = computed<Cobranca>(() => detalhe.cobranca.value ?? props.cobranca)

const parcelada = computed(() => atual.value.parcelas.length > 1)
const vencimento = computed(() => parcelaDeReferencia(atual.value)?.vencimento ?? null)

const historico = computed(() =>
  atual.value.parcelas
    .flatMap((parcela) => parcela.recebimentos.map((recebimento) => ({ recebimento, parcela: parcela.numero })))
    .sort(
      (a, b) =>
        b.recebimento.dataRecebimento.localeCompare(a.recebimento.dataRecebimento) || b.recebimento.id - a.recebimento.id,
    ),
)
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes da Cobrança"
    :subtitulo="descricaoCobranca(cobranca.descricao)"
    icone="olho"
    largura="720px"
    @fechar="$emit('fechar')"
  >
    <div class="resumo-topo">
      <div class="resumo-selos">
        <span class="tipo">{{ ROTULO_TIPO_COBRANCA[atual.tipo] }}</span>
        <SeloStatusCobranca
          :status="atual.status"
          :rotulo="ROTULO_STATUS_COBRANCA[atual.status]"
        />
      </div>
      <p class="datas">
        Cobrança criada em: <strong>{{ instanteParaDataBr(atual.criadaEm) }}</strong>
      </p>
      <p
        v-if="vencimento"
        class="datas"
      >
        Vencimento em: <strong>{{ isoParaDataBr(vencimento) }}</strong>
      </p>
    </div>

    <section class="secao">
      <h3 class="secao-titulo">
        Resumo Financeiro
      </h3>
      <dl class="financeiro">
        <div class="financeiro-item">
          <dt>Total</dt>
          <dd>{{ formatarMoeda(atual.valorTotal) }}</dd>
        </div>
        <div class="financeiro-item">
          <dt>Recebido</dt>
          <dd>{{ formatarMoeda(atual.valorRecebido) }}</dd>
        </div>
        <div class="financeiro-item financeiro-item--restante">
          <dt>Restante</dt>
          <dd>{{ formatarMoeda(atual.valorRestante) }}</dd>
        </div>
      </dl>
    </section>

    <section
      v-if="parcelada"
      class="secao"
    >
      <h3 class="secao-titulo">
        Parcelas ({{ atual.parcelas.length }})
      </h3>
      <CobrancaParcelas :parcelas="atual.parcelas" />
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Histórico de Recebimentos
      </h3>

      <p
        v-if="detalhe.erro.value"
        class="aviso"
        role="alert"
      >
        Não foi possível carregar quem registrou cada recebimento. {{ detalhe.erro.value }}
        <button
          type="button"
          class="aviso-tentar"
          @click="detalhe.carregar()"
        >
          Tentar novamente
        </button>
      </p>

      <ul
        v-if="historico.length > 0"
        class="historico"
      >
        <li
          v-for="{ recebimento, parcela } in historico"
          :key="recebimento.id"
          class="recebimento"
        >
          <div class="recebimento-linha">
            <div class="recebimento-principal">
              <span class="recebimento-valor">{{ formatarMoeda(recebimento.valor) }}</span>
              <span class="recebimento-data">Recebido em {{ isoParaDataBr(recebimento.dataRecebimento) }}</span>
            </div>
            <span class="recebimento-forma">{{ ROTULO_FORMA_PAGAMENTO[recebimento.formaPagamento] }}</span>
          </div>
          <p
            v-if="parcelada || recebimento.registradoPorUsuario"
            class="recebimento-apoio"
          >
            <template v-if="parcelada">
              Parcela {{ parcela }}
            </template>
            <template v-if="parcelada && recebimento.registradoPorUsuario">
              ·
            </template>
            <template v-if="recebimento.registradoPorUsuario">
              Registrado por {{ nomeDeQuemRegistrou(recebimento.registradoPorUsuario) }}
            </template>
          </p>
          <p
            v-if="recebimento.observacoes"
            class="recebimento-obs"
          >
            {{ recebimento.observacoes }}
          </p>
        </li>
      </ul>
      <p
        v-else
        class="vazio"
      >
        Nenhum recebimento registrado.
      </p>
    </section>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        @click="$emit('fechar')"
      >
        Fechar
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.resumo-topo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resumo-selos {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.tipo {
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 600;
}

.datas {
  margin: 0;
  color: #6a7282;
  font-size: 13px;
}

.datas strong {
  color: #333;
  font-weight: 600;
}

.secao {
  margin-top: 22px;
}

.secao-titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.financeiro {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.financeiro-item {
  padding: 12px 16px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.financeiro-item dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.financeiro-item dd {
  margin: 0;
  color: var(--fp-verde);
  font-size: 16px;
  font-weight: 600;
}

.financeiro-item--restante dd {
  color: #333;
}

.historico {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.recebimento {
  padding: 10px 16px;
  border: 1px solid var(--fp-verde-20);
  border-radius: var(--fp-raio);
}

.recebimento-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

/* Figma: valor em destaque, data logo abaixo e a forma de pagamento à direita. */
.recebimento-principal {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recebimento-valor {
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.recebimento-data {
  color: #6a7282;
  font-size: 12px;
}

.recebimento-forma {
  padding: 2px 10px;
  border: 1px solid var(--fp-verde-30);
  border-radius: 999px;
  background-color: var(--fp-verde-10);

  color: var(--fp-verde);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.recebimento-apoio,
.recebimento-obs {
  margin: 2px 0 0;
  color: #6a7282;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.recebimento-obs {
  font-style: italic;
}

.vazio {
  margin: 0;
  padding: 14px 16px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);

  color: var(--fp-cinza-rotulo);
  font-size: 13px;
  text-align: center;
}

.aviso {
  margin: 0 0 10px;
  color: var(--fp-vermelho-escuro);
  font-size: 13px;
}

.aviso-tentar {
  padding: 0;
  border: 0;
  background: none;

  color: var(--fp-verde);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

@media (max-width: 560px) {
  .financeiro {
    grid-template-columns: 1fr;
  }
}
</style>
