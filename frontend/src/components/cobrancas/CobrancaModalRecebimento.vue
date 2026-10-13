<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioRecebimento } from '../../composables/useFormularioRecebimento'
import { registrarRecebimento } from '../../services/cobrancas.service'
import type { Cobranca } from '../../types'
import {
  descricaoCobranca,
  OPCOES_FORMA_PAGAMENTO,
  parcelaDeReferencia,
  restanteDaParcela,
} from '../../utils/cobrancas'
import { formatarMoeda, isoParaDataBr, mascararMoeda } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'

const props = defineProps<{ cobranca: Cobranca }>()

const emit = defineEmits<{
  fechar: []
  registrado: []
  /** O backend indicou que a cobrança mudou (já paga, cancelada...): a tela precisa recarregar. */
  desatualizado: []
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const form = useFormularioRecebimento(props.cobranca)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

const vencimento = computed(() => parcelaDeReferencia(props.cobranca)?.vencimento ?? null)

const total = computed(() => props.cobranca.parcelas.length)
const opcoesParcela = computed(() =>
  form.parcelasAbertas.map((parcela) => {
    const valor = formatarMoeda(restanteDaParcela(parcela))
    const data = isoParaDataBr(parcela.vencimento)
    const rotulo =
      total.value > 1 ? `Parcela ${parcela.numero} de ${total.value} — ${valor} (venc. ${data})` : `Parcela única — ${valor} (venc. ${data})`
    return { valor: String(parcela.id), rotulo }
  }),
)

function pedirFechar() {
  if (form.alterado.value && !salvando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErro() {
  await Promise.resolve()
  raiz.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function confirmar() {
  if (!form.validar()) {
    await focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await registrarRecebimento(props.cobranca.id, form.paraPayload())
    emit('registrado')
  } catch (erro) {
    form.tratarErroApi(erro)
    if (form.desatualizado.value) emit('desatualizado')
    await focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Registrar Recebimento"
    :subtitulo="descricaoCobranca(cobranca.descricao)"
    icone="check"
    largura="560px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="recebimento"
      novalidate
      @submit.prevent="confirmar"
    >
      <div class="resumo">
        <p class="resumo-datas">
          Cobrança criada em: <strong>{{ isoParaDataBr(cobranca.criadaEm) }}</strong>
          <template v-if="vencimento">
            <span aria-hidden="true"> · </span>
            Vencimento em: <strong>{{ isoParaDataBr(vencimento) }}</strong>
          </template>
        </p>
        <p class="resumo-pagar">
          <span class="resumo-rotulo">Valor a pagar:</span>
          <span class="resumo-valor">{{ formatarMoeda(cobranca.valorRestante) }}</span>
        </p>
      </div>

      <CampoFormulario
        v-model="form.campos.parcelaId"
        rotulo="Referente à Parcela:"
        tipo="select"
        obrigatorio
        :opcoes="opcoesParcela"
        :desabilitado="opcoesParcela.length === 1"
        :erro="form.erros.parcelaId"
      />

      <div class="duas-colunas">
        <CampoFormulario
          v-model="form.campos.valor"
          rotulo="Valor Recebido:"
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="form.erros.valor"
        />
        <CampoData
          v-model="form.campos.data"
          rotulo="Data do Recebimento:"
          obrigatorio
          :erro="form.erros.data"
        />
      </div>

      <CampoFormulario
        v-model="form.campos.formaPagamento"
        rotulo="Forma de Pagamento:"
        tipo="select"
        obrigatorio
        placeholder="Selecione a forma de pagamento"
        :opcoes="OPCOES_FORMA_PAGAMENTO"
        :erro="form.erros.formaPagamento"
      />

      <CampoFormulario
        v-model="form.campos.observacoes"
        rotulo="Observações (opcional):"
        tipo="area"
        placeholder="Observações..."
        :linhas="3"
        :maxlength="1000"
        :erro="form.erros.observacoes"
      />

      <p
        v-if="form.erroGeral.value"
        class="erro-geral"
        role="alert"
      >
        {{ form.erroGeral.value }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
      >
        Confirmar Recebimento
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar recebimento?"
    mensagem="Os dados informados para este recebimento serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.recebimento {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resumo {
  padding: 14px 18px;
  border: 1px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.resumo-datas {
  margin: 0 0 8px;
  color: #6a7282;
  font-size: 13px;
}

.resumo-datas strong {
  color: #333;
  font-weight: 600;
}

.resumo-pagar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
}

.resumo-rotulo {
  color: #4a5565;
  font-size: 14px;
  font-weight: 500;
}

.resumo-valor {
  color: var(--fp-verde);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
}

.duas-colunas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.erro-geral {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;

  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 560px) {
  .duas-colunas {
    grid-template-columns: 1fr;
  }
}
</style>
