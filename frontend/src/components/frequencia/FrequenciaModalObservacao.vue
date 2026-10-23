<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import FrequenciaResumoRegistro from './FrequenciaResumoRegistro.vue'
import { extrairMensagemErro } from '../../services/api'
import { atualizarObservacao } from '../../services/frequencias.service'
import { diaDaSemana } from '../../utils/datas'
import { isoParaDataBr } from '../../utils/formatadores'
import { exigeObservacao, rotuloStatus, type LinhaFolha } from '../../utils/frequencia'

const props = defineProps<{
  /** Data do registro (YYYY-MM-DD). */
  data: string
  linha: LinhaFolha
  /**
   * true: grava na API (PATCH) e exige registro existente (consulta).
   * false: só devolve o texto, que fica no rascunho da folha até "Salvar Frequência" (edição).
   */
  gravarNaApi: boolean
}>()

const emit = defineEmits<{
  fechar: []
  /** Observação já tratada (sem espaços nas pontas). Na gravação pela API, ela já foi salva. */
  salvo: [observacao: string]
}>()

const idFormulario = useId()
const observacao = shallowRef(props.linha.observacao)
const erro = shallowRef<string | undefined>()
const erroApi = shallowRef<string | null>(null)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

// Texto diferente do que a linha já tinha (espaços nas pontas não contam).
const alterado = computed(() => observacao.value.trim() !== props.linha.observacao.trim())

/** X, Esc, clique fora e Cancelar: com texto alterado pergunta antes de descartar. */
function pedirFechar() {
  if (alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

const subtitulo = computed(() => `${isoParaDataBr(props.data)} · ${diaDaSemana(props.data)}`)
const obrigatoria = computed(() => exigeObservacao(props.linha.status))

async function salvar() {
  if (salvando.value) return
  const texto = observacao.value.trim()
  erro.value = undefined
  erroApi.value = null

  if (obrigatoria.value && texto === '') {
    erro.value = `Informe a observação: ${rotuloStatus(props.linha.status)} exige justificativa.`
    return
  }

  if (!props.gravarNaApi) {
    emit('salvo', texto)
    return
  }

  if (props.linha.id === null) return
  salvando.value = true
  try {
    await atualizarObservacao(props.linha.id, texto)
    emit('salvo', texto)
  } catch (e) {
    erroApi.value = extrairMensagemErro(e)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Editar Observação"
    :subtitulo="subtitulo"
    icone="lapis"
    largura="520px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      novalidate
      @submit.prevent="salvar"
    >
      <FrequenciaResumoRegistro :linha="linha" />

      <CampoFormulario
        v-model="observacao"
        tipo="area"
        rotulo="Observação"
        :obrigatorio="obrigatoria"
        :erro="erro"
        :linhas="4"
        placeholder="Descreva o motivo, horário, atestado, etc..."
      />

      <p
        v-if="erroApi"
        class="obs-erro"
        role="alert"
      >
        {{ erroApi }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
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
        Salvar
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    mensagem="A observação digitada será perdida."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.obs-erro {
  margin: 14px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
