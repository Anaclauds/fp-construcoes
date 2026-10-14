<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioRecebimento } from '../../composables/useFormularioRecebimento'
import { registrarRecebimento } from '../../services/cobrancas.service'
import type { Cobranca } from '../../types'
import {
  descricaoCobranca,
  OPCOES_FORMA_PAGAMENTO,
  parcelaDeReferencia,
  restanteDaParcela,
} from '../../utils/cobrancas'
import { formatarMoeda, instanteParaDataBr, isoParaDataBr, mascararMoeda } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'

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

// Vencimento da parcela escolhida (muda junto com ela); sem parcela escolhida, o da parcela de referência.
const vencimento = computed(
  () => form.parcelaEscolhida.value?.vencimento ?? parcelaDeReferencia(props.cobranca)?.vencimento ?? null,
)

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
  await nextTick()
  focarPrimeiroErroEm(raiz.value)
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
    icone="check"
    largura="520px"
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
        <p class="resumo-titulo">
          {{ descricaoCobranca(cobranca.descricao) }}
        </p>
        <p class="resumo-linha">
          Cobrança criada em: <strong>{{ instanteParaDataBr(cobranca.criadaEm) }}</strong>
        </p>
        <p
          v-if="vencimento"
          class="resumo-linha"
        >
          Vencimento em: <strong>{{ isoParaDataBr(vencimento) }}</strong>
        </p>
        <p class="resumo-pagar">
          Valor a pagar: <strong class="resumo-valor">{{ formatarMoeda(form.restanteEscolhido.value) }}</strong>
        </p>
      </div>

      <CampoFormulario
        v-model="form.campos.parcelaId"
        rotulo="Referente à Parcela"
        tipo="select"
        obrigatorio
        :opcoes="opcoesParcela"
        :desabilitado="opcoesParcela.length === 1"
        :erro="form.erros.parcelaId"
      />

      <CampoFormulario
        v-model="form.campos.valor"
        rotulo="Valor Recebido"
        obrigatorio
        placeholder="R$ 0,00"
        inputmode="numeric"
        autocomplete="off"
        :mascara="mascararMoeda"
        :erro="form.erros.valor"
      />
      <CampoData
        v-model="form.campos.data"
        rotulo="Data do Recebimento"
        obrigatorio
        :erro="form.erros.data"
      />

      <CampoFormulario
        v-model="form.campos.formaPagamento"
        rotulo="Forma de Pagamento"
        tipo="select"
        obrigatorio
        placeholder="Selecione a forma de pagamento"
        :opcoes="OPCOES_FORMA_PAGAMENTO"
        :erro="form.erros.formaPagamento"
      />

      <CampoFormulario
        v-model="form.campos.observacoes"
        rotulo="Observações (opcional)"
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

.resumo-titulo {
  margin: 0 0 4px;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.resumo-linha,
.resumo-pagar {
  margin: 0;
  color: #6a7282;
  font-size: 13px;
  line-height: 1.6;
}

.resumo-linha strong {
  color: #333;
  font-weight: 600;
}

.resumo-pagar {
  margin-top: 4px;
  color: #4a5565;
  font-size: 14px;
  font-weight: 500;
}

.resumo-valor {
  color: var(--fp-verde);
  font-size: 16px;
  font-weight: 700;
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

</style>
