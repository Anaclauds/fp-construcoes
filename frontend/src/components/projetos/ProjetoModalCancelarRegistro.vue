<script setup lang="ts">
import { computed, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { extrairErro } from '../../services/api'
import { cancelarEtapa, cancelarExtra } from '../../services/projetos.service'
import type { ProjetoDetalhe, RegistroEditavel } from '../../types/projeto'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import { isoParaDataBr } from '../../utils/formatadores'
import { mensagemProjeto } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'

const props = defineProps<{
  projetoId: number
  registro: RegistroEditavel
}>()

const emit = defineEmits<{
  fechar: []
  /** Leva o projeto atualizado (formato do detalhe); o registro cancelado continua nele, com `canceladoEm`. */
  cancelado: [projeto: ProjetoDetalhe]
  /** O backend recusou por conflito (já cancelado, recebimento...): os detalhes do projeto precisam recarregar. */
  desatualizado: []
}>()

/** Limites do motivo no backend (3 a 500 caracteres, depois de aparar). */
const MOTIVO_MINIMO = 3
const MOTIVO_MAXIMO = 500

const ehEtapa = props.registro.tipo === 'etapa'
const nome = ehEtapa ? 'etapa' : 'extra'

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const motivo = shallowRef('')
const erroMotivo = shallowRef<string | undefined>(undefined)
const erroGeral = shallowRef<string | null>(null)
const enviando = shallowRef(false)
/** Depois de um 409 a operação não é reenviada: só resta fechar (os detalhes já foram recarregados). */
const recusado = shallowRef(false)

watch(motivo, () => (erroMotivo.value = undefined))

const efeitos = computed(() =>
  ehEtapa
    ? [
        'A cobrança da etapa e as parcelas dela são canceladas, e o valor sai do total medido do projeto.',
        'Só é possível se a cobrança da etapa ainda não tem nenhum recebimento.',
      ]
    : [
        'As reservas de estoque ativas do extra são liberadas e a despesa vinculada (se houver) é estornada no caixa.',
        'Não é possível se o material já foi consumido ou se o projeto já tem recebimento registrado.',
      ],
)

function validar(): boolean {
  const tamanho = motivo.value.trim().length
  if (tamanho === 0) erroMotivo.value = 'Informe o motivo do cancelamento.'
  else if (tamanho < MOTIVO_MINIMO) erroMotivo.value = `Use pelo menos ${MOTIVO_MINIMO} caracteres.`
  else if (tamanho > MOTIVO_MAXIMO) erroMotivo.value = `Use no máximo ${MOTIVO_MAXIMO} caracteres.`
  else erroMotivo.value = undefined
  return erroMotivo.value === undefined
}

async function confirmar() {
  // Clique duplo: a primeira chamada ainda está em andamento.
  if (enviando.value || recusado.value) return
  if (!validar()) {
    await Promise.resolve()
    focarPrimeiroErroEm(raiz.value)
    return
  }

  enviando.value = true
  erroGeral.value = null
  try {
    const motivoFinal = motivo.value.trim()
    const projeto = ehEtapa
      ? await cancelarEtapa(props.projetoId, props.registro.id, motivoFinal)
      : await cancelarExtra(props.projetoId, props.registro.id, motivoFinal)
    emit('cancelado', projeto)
  } catch (e) {
    const { mensagem, status } = extrairErro(e)
    erroGeral.value = mensagemProjeto(mensagem)
    // Conflito ou registro sumido: a tela está velha. Mostra o motivo, recarrega os detalhes e não reenvia.
    if (status === 409 || status === 404) {
      recusado.value = true
      emit('desatualizado')
    }
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    :titulo="`Cancelar ${ehEtapa ? 'Etapa' : 'Extra'}`"
    :subtitulo="`Registro de ${isoParaDataBr(registro.data)}`"
    variante="vermelho"
    icone="x"
    largura="560px"
    :bloqueado="enviando"
    @fechar="emit('fechar')"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="cancelar"
      novalidate
      @submit.prevent="confirmar"
    >
      <p class="resumo">
        {{ registro.texto }}
      </p>

      <section
        class="efeitos"
        aria-live="polite"
      >
        <h3 class="efeitos-titulo">
          O que acontece ao cancelar {{ ehEtapa ? 'a' : 'o' }} {{ nome }}
        </h3>
        <ul>
          <li
            v-for="efeito in efeitos"
            :key="efeito"
          >
            {{ efeito }}
          </li>
          <li>O registro continua no histórico, identificado como cancelado, e não pode ser editado nem cancelado de novo.</li>
        </ul>
      </section>

      <CampoFormulario
        v-model="motivo"
        rotulo="Motivo do cancelamento:"
        tipo="area"
        obrigatorio
        :linhas="3"
        placeholder="Ex: Lançamento registrado incorretamente"
        :maxlength="MOTIVO_MAXIMO"
        :erro="erroMotivo"
        :desabilitado="enviando || recusado"
      />

      <ProjetoAvisoErro
        v-if="erroGeral"
        :mensagem="erroGeral"
      />
    </form>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="enviando"
        @click="emit('fechar')"
      >
        Voltar
      </BotaoFp>
      <BotaoFp
        type="submit"
        variante="perigo"
        :form="idFormulario"
        :carregando="enviando"
        :desabilitado="recusado"
      >
        Confirmar cancelamento
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.cancelar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resumo {
  margin: 0;
  padding: 10px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
  color: #333;
  font-size: 13.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.efeitos {
  padding: 14px 18px;
  border: 1.3px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;
}

.efeitos-titulo {
  margin: 0 0 6px;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 600;
}

.efeitos ul {
  margin: 0;
  padding-left: 18px;
  color: #4a5565;
  font-size: 13.5px;
  line-height: 1.55;
}
</style>
