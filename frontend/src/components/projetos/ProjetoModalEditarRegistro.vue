<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { extrairErro } from '../../services/api'
import { editarEtapa, editarExtra } from '../../services/projetos.service'
import type { ProjetoDetalhe, RegistroEditavel } from '../../types/projeto'
import { hojeIso } from '../../utils/datas'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import { dataBrParaIso, isoParaDataBr } from '../../utils/formatadores'
import { ANO_MINIMO_DATA_PROJETO, mensagemProjeto } from '../../utils/projetos'
import { dataBrValida } from '../../utils/validacao'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'

const props = defineProps<{
  projetoId: number
  registro: RegistroEditavel
}>()

const emit = defineEmits<{
  fechar: []
  /** Leva o projeto atualizado (formato do detalhe). */
  salvo: [projeto: ProjetoDetalhe]
  /** O backend indicou que o projeto ou o registro mudou: os detalhes precisam recarregar. */
  desatualizado: []
}>()

const ehEtapa = props.registro.tipo === 'etapa'
const nome = ehEtapa ? 'Etapa' : 'Extra'
const rotuloTexto = ehEtapa ? 'Descrição:' : 'Justificativa:'
/** Limite do backend ao editar a descrição da etapa e a justificativa do extra (o extra pode ter sido criado com até 3000). */
const LIMITE_TEXTO = 1000
/**
 * Códigos de conflito que indicam tela desatualizada (projeto fora de execução ou registro já cancelado).
 * Atenção: `PROJETOS_*_CONFLICT_nn` são códigos GERADOS e instáveis (mudam se o back renumerar); a API não tem código
 * legível para "etapa/extra cancelado". Só `PROJETO_STATUS_INVALIDO` é estável. Último recurso, revisar se o back mudar.
 */
const CODIGOS_DESATUALIZADO = ['PROJETO_STATUS_INVALIDO', 'PROJETOS_UPDATEETAPA_CONFLICT_01', 'PROJETOS_UPDATEEXTRA_CONFLICT_01']

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const texto = shallowRef(props.registro.texto)
const data = shallowRef(isoParaDataBr(props.registro.data))
const erroTexto = shallowRef<string | undefined>(undefined)
const erroData = shallowRef<string | undefined>(undefined)
const erroGeral = shallowRef<string | null>(null)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

watch(texto, () => (erroTexto.value = undefined))
watch(data, () => (erroData.value = undefined))

const textoMudou = computed(() => texto.value.trim() !== props.registro.texto.trim())
const dataMudou = computed(() => !props.registro.dataTravada && data.value !== isoParaDataBr(props.registro.data))
const alterado = computed(() => textoMudou.value || dataMudou.value)

function pedirFechar() {
  if (alterado.value && !salvando.value) confirmandoSaida.value = true
  else emit('fechar')
}

function validar(): boolean {
  const valor = texto.value.trim()
  // O limite de 1000 só vale para o texto que vai ser enviado: extra criado com mais de 1000 permite editar só a data.
  if (valor === '') erroTexto.value = ehEtapa ? 'Informe a descrição.' : 'Informe a justificativa.'
  else if (textoMudou.value && valor.length > LIMITE_TEXTO) erroTexto.value = `Use no máximo ${LIMITE_TEXTO} caracteres.`
  else erroTexto.value = undefined

  if (!dataMudou.value) erroData.value = undefined
  else if (data.value === '') erroData.value = 'Informe a data.'
  else if (!dataBrValida(data.value, ANO_MINIMO_DATA_PROJETO)) erroData.value = 'Data inválida. Use DD/MM/AAAA.'
  else if (dataBrParaIso(data.value) > hojeIso()) erroData.value = 'A data do registro não pode ser futura.'
  else erroData.value = undefined

  return !erroTexto.value && !erroData.value
}

async function salvar() {
  if (salvando.value) return
  if (!validar()) {
    await Promise.resolve()
    focarPrimeiroErroEm(raiz.value)
    return
  }
  if (!alterado.value) {
    emit('fechar')
    return
  }

  const dataRegistro = dataMudou.value ? dataBrParaIso(data.value) : undefined
  salvando.value = true
  erroGeral.value = null
  try {
    const projeto = ehEtapa
      ? await editarEtapa(props.projetoId, props.registro.id, {
          ...(textoMudou.value ? { descricao: texto.value.trim() } : {}),
          ...(dataRegistro ? { dataRegistro } : {}),
        })
      : await editarExtra(props.projetoId, props.registro.id, {
          ...(textoMudou.value ? { descricaoJustificativa: texto.value.trim() } : {}),
          ...(dataRegistro ? { dataRegistro } : {}),
        })
    emit('salvo', projeto)
  } catch (e) {
    const { mensagem, status, codigo } = extrairErro(e)
    erroGeral.value = mensagemProjeto(mensagem, codigo)
    // 404 (registro/projeto sumiu) e 409 por status do projeto ou do registro mudam a tela de fundo; 409 de recebimento/despesa não.
    if (status === 404 || CODIGOS_DESATUALIZADO.includes(codigo)) emit('desatualizado')
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    :titulo="`Editar ${nome}`"
    icone="lapis"
    largura="560px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="editar"
      novalidate
      @submit.prevent="salvar"
    >
      <p class="nota">
        {{ ehEtapa
          ? 'Só a descrição e a data da etapa podem ser corrigidas. Valores e serviços não mudam, e a edição é recusada se a cobrança da etapa já tem recebimento.'
          : 'Só a justificativa e a data do extra podem ser corrigidas. Materiais, serviços e custos não mudam.' }}
      </p>

      <CampoFormulario
        v-model="texto"
        :rotulo="rotuloTexto"
        tipo="area"
        obrigatorio
        :linhas="4"
        :maxlength="registro.texto.length > LIMITE_TEXTO ? undefined : LIMITE_TEXTO"
        :erro="erroTexto"
      />

      <CampoLeitura
        v-if="registro.dataTravada"
        rotulo="Data do registro"
        :valor="isoParaDataBr(registro.data)"
      />
      <CampoData
        v-else
        v-model="data"
        rotulo="Data do registro:"
        obrigatorio
        :ano-minimo="ANO_MINIMO_DATA_PROJETO"
        :erro="erroData"
      />
      <p
        v-if="registro.dataTravada"
        class="nota nota--aviso"
      >
        A data não pode ser alterada: este extra já gerou despesa no caixa.
      </p>

      <ProjetoAvisoErro
        v-if="erroGeral"
        :mensagem="erroGeral"
      />
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
        :desabilitado="!alterado"
      >
        Salvar Alterações
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    :mensagem="`As alterações feitas ${ehEtapa ? 'na etapa' : 'no extra'} serão perdidas.`"
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.editar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nota {
  margin: 0;
  color: #6a7282;
  font-size: 13px;
  line-height: 1.45;
}

.nota--aviso {
  margin-top: -8px;
}
</style>
