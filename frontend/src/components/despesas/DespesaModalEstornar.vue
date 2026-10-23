<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import { extrairErro } from '../../services/api'
import { cancelarDespesa } from '../../services/despesas.service'
import type { Despesa } from '../../types/despesa'
import { mensagemEstorno, primeiraLinha } from '../../utils/despesas'
import { formatarMoeda, isoParaDataBr, limparEspacos } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'

/** Confirmação de estorno com motivo (3 a 500 caracteres). Monte com `v-if`. */
const props = defineProps<{ despesa: Despesa }>()

const emit = defineEmits<{
  fechar: []
  /** A API confirmou o estorno (`canceladoEm` preenchido): recarregue a lista. */
  estornada: [despesa: Despesa]
  /** A API recusou por conflito (409): a lista pode estar desatualizada e precisa ser recarregada. */
  conflito: []
}>()

const MOTIVO_MINIMO = 3
const MOTIVO_MAXIMO = 500

const idFormulario = useId()
const motivo = shallowRef('')
const erroMotivo = shallowRef<string | undefined>()
const erroApi = shallowRef<string | null>(null)
const enviando = shallowRef(false)
/** Depois de um conflito a confirmação não é reenviada: o usuário fecha e confere a lista atualizada. */
const recusada = shallowRef(false)

const ehCompra = computed(() => props.despesa.tipo === 'COMPRA_MATERIAL')

async function confirmar() {
  // Sem clique duplo: enquanto a requisição está em andamento ou depois de recusada, nada é reenviado.
  if (enviando.value || recusada.value) return
  const texto = limparEspacos(motivo.value)
  if (texto.length < MOTIVO_MINIMO) {
    erroMotivo.value = `Informe o motivo (mínimo ${MOTIVO_MINIMO} caracteres).`
    return
  }
  if (texto.length > MOTIVO_MAXIMO) {
    erroMotivo.value = `Use no máximo ${MOTIVO_MAXIMO} caracteres.`
    return
  }
  enviando.value = true
  erroMotivo.value = undefined
  erroApi.value = null
  try {
    const resultado = await cancelarDespesa(props.despesa.id, { motivo: texto })
    if (resultado.canceladoEm) {
      emit('estornada', resultado)
    } else {
      // A API respondeu sem erro, mas a despesa não consta como estornada: não afirma sucesso.
      recusada.value = true
      erroApi.value = 'A API não confirmou o estorno desta despesa. Atualizamos a lista; confira antes de tentar de novo.'
      emit('conflito')
    }
  } catch (e) {
    const { status, mensagem } = extrairErro(e)
    erroApi.value = mensagemEstorno(mensagem)
    if (status === 409) {
      recusada.value = true
      emit('conflito')
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Estornar Despesa"
    :subtitulo="`${isoParaDataBr(despesa.data)} · ${formatarMoeda(despesa.valorTotal)}`"
    variante="vermelho"
    icone="x"
    largura="520px"
    :bloqueado="enviando"
    @fechar="emit('fechar')"
  >
    <p class="resumo">
      {{ primeiraLinha(despesa.descricao) }}
    </p>

    <div class="aviso">
      <strong>Atenção</strong>
      A despesa fica no histórico como estornada, sem poder ser editada, e o caixa recebe uma entrada de
      compensação no mês dela.
      <template v-if="ehCompra">
        O estoque dos materiais comprados será reduzido; se algum já foi usado ou reservado em projeto, o estorno
        é recusado.
      </template>
    </div>

    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="confirmar"
    >
      <CampoFormulario
        v-model="motivo"
        rotulo="Motivo do estorno:"
        tipo="area"
        obrigatorio
        placeholder="Ex.: Lançamento registrado incorretamente"
        :linhas="3"
        :maxlength="MOTIVO_MAXIMO"
        :desabilitado="recusada"
        :erro="erroMotivo"
        @update:model-value="erroMotivo = undefined"
      />
    </form>

    <p
      v-if="erroApi"
      class="erro"
      role="alert"
    >
      {{ erroApi }}
    </p>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="enviando"
        @click="emit('fechar')"
      >
        {{ recusada ? 'Fechar' : 'Cancelar' }}
      </BotaoFp>
      <BotaoFp
        v-if="!recusada"
        type="submit"
        variante="perigo-suave"
        :form="idFormulario"
        :carregando="enviando"
      >
        Estornar Despesa
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.resumo {
  margin: 0 0 12px;
  color: var(--fp-texto-corpo);
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.aviso {
  margin-bottom: 14px;
  padding: 12px 16px;
  border: 1px solid #fca5a5;
  border-radius: 10px;
  background-color: #fef2f2;

  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  line-height: 1.45;
}

.aviso strong {
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
}

.erro {
  margin: 14px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
