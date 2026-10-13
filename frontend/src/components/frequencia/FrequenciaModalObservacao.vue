<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
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

const observacao = shallowRef(props.linha.observacao)
const erro = shallowRef<string | undefined>()
const erroApi = shallowRef<string | null>(null)
const salvando = shallowRef(false)

const subtitulo = computed(() => `${isoParaDataBr(props.data)} · ${diaDaSemana(props.data)}`)
const obrigatoria = computed(() => exigeObservacao(props.linha.status))

async function salvar() {
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
    @fechar="emit('fechar')"
  >
    <form
      id="form-observacao"
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
        @click="emit('fechar')"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        form="form-observacao"
        :carregando="salvando"
      >
        Salvar
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.obs-erro {
  margin: 14px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
