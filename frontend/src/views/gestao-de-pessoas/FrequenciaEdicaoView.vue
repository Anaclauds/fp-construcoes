<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import FolhaFrequenciaTabela from '../../components/frequencia/FolhaFrequenciaTabela.vue'
import FrequenciaModalObservacao from '../../components/frequencia/FrequenciaModalObservacao.vue'
import FrequenciaModalPendencia from '../../components/frequencia/FrequenciaModalPendencia.vue'
import FrequenciaModalVisualizar from '../../components/frequencia/FrequenciaModalVisualizar.vue'
import FrequenciaPagina from '../../components/frequencia/FrequenciaPagina.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import ModalConfirmacao from '../../components/ui/ModalConfirmacao.vue'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import { useDataDaRota } from '../../composables/useDataDaRota'
import { useEdicaoFolha } from '../../composables/useEdicaoFolha'
import { useFolhaFrequencia } from '../../composables/useFolhaFrequencia'
import { useToast } from '../../composables/useToast'
import { extrairErro } from '../../services/api'
import { salvarFolha } from '../../services/frequencias.service'
import { hojeIso } from '../../utils/datas'
import { isoParaDataBr } from '../../utils/formatadores'
import { calcularIndicadores, type LinhaFolha } from '../../utils/frequencia'

type Modal = { tipo: 'visualizar' | 'observacao'; linha: LinhaFolha } | null

const router = useRouter()
const { mostrarToast } = useToast()

const { data, irParaData } = useDataDaRota('frequenciaEditar', { limitarAHoje: true })
const { registros, carregando, erro, carregar } = useFolhaFrequencia(data)
const edicao = useEdicaoFolha(registros)

// Cards acompanham o rascunho: marcar um status já tira o funcionário de "não registradas".
const indicadores = computed(() => calcularIndicadores(edicao.linhas.value))

const aviso = useAvisoAlteracoes(edicao.houveAlteracoes)

const modal = shallowRef<Modal>(null)
const nomesPendentes = shallowRef<string[] | null>(null)
const salvando = shallowRef(false)

const resumo = computed(() => {
  const total = edicao.linhas.value.length
  return `${total} ${total === 1 ? 'funcionário' : 'funcionários'} · ${isoParaDataBr(data.value)}`
})

function abrir(tipo: NonNullable<Modal>['tipo'], linha: LinhaFolha) {
  modal.value = { tipo, linha }
}

function aoSalvarObservacao(observacao: string) {
  if (modal.value) edicao.definirObservacao(modal.value.linha.funcionarioId, observacao)
  modal.value = null
}

/** Depois do aviso, leva o foco ao lápis do primeiro funcionário pendente. */
async function irParaPrimeiraPendencia(ids: number[]) {
  const primeiro = ids[0]
  if (primeiro === undefined) return
  await nextTick()
  const botao = document.querySelector<HTMLElement>(`[data-obs-funcionario="${primeiro}"]`)
  botao?.scrollIntoView({ block: 'center' })
  botao?.focus()
}

const primeirosPendentes = shallowRef<number[]>([])

function mostrarPendencias(ids: number[]) {
  const nomePorId = new Map(edicao.linhas.value.map((l) => [l.funcionarioId, l.nome]))
  nomesPendentes.value = ids.map((id) => nomePorId.get(id) ?? `Funcionário ${id}`)
  primeirosPendentes.value = ids
}

async function fecharPendencias() {
  nomesPendentes.value = null
  await irParaPrimeiraPendencia(primeirosPendentes.value)
}

async function salvar() {
  if (salvando.value) return
  // Checagem antes de enviar: o mesmo bloqueio que a API faria, sem ida e volta.
  const pendentes = edicao.pendentes.value
  if (pendentes.length > 0) {
    mostrarPendencias(pendentes.map((l) => l.funcionarioId))
    return
  }

  salvando.value = true
  try {
    await salvarFolha({ data: data.value, registros: edicao.paraPayload() })
    edicao.descartar()
    mostrarToast('Frequência salva!')
    await router.push({ name: 'frequencia', query: { data: data.value } })
  } catch (e) {
    const falha = extrairErro(e)
    if (falha.funcionariosPendentes.length > 0) mostrarPendencias(falha.funcionariosPendentes)
    else mostrarToast(falha.mensagem, 'erro')
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <FrequenciaPagina
    titulo="Gerenciar Frequência"
    subtitulo="Registre o status de cada funcionário no dia selecionado"
    :indicadores="indicadores"
    :data="data"
    :data-maxima="hojeIso()"
    @update:data="irParaData"
  >
    <template #aviso>
      <strong>Como funciona:</strong> selecione o status de cada funcionário. Meio Período e Falta
      Justificada exigem observação (lápis). Nada é gravado antes de <strong>Salvar Frequência</strong>.
    </template>

    <FolhaFrequenciaTabela
      :linhas="edicao.linhas.value"
      editavel
      pode-gerenciar
      :carregando="carregando"
      :erro="erro"
      :pendentes="edicao.idsPendentes.value"
      @alterar-status="edicao.definirStatus"
      @visualizar="(linha) => abrir('visualizar', linha)"
      @editar-observacao="(linha) => abrir('observacao', linha)"
      @tentar-novamente="carregar"
    >
      <template #rodape>
        <span
          class="resumo"
          aria-live="polite"
        >{{ resumo }}</span>
        <div class="acoes">
          <BotaoFp
            variante="secundario"
            tamanho="pagina"
            :desabilitado="salvando"
            @click="router.push({ name: 'frequencia', query: { data } })"
          >
            Cancelar
          </BotaoFp>
          <BotaoFp
            tamanho="pagina"
            :carregando="salvando"
            :desabilitado="!edicao.houveAlteracoes.value"
            :title="edicao.houveAlteracoes.value ? undefined : 'Nenhuma alteração para salvar'"
            @click="salvar"
          >
            Salvar Frequência
          </BotaoFp>
        </div>
      </template>
    </FolhaFrequenciaTabela>

    <FrequenciaModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :data="data"
      :linha="modal.linha"
      @fechar="modal = null"
    />
    <FrequenciaModalObservacao
      v-else-if="modal?.tipo === 'observacao'"
      :key="modal.linha.funcionarioId"
      :data="data"
      :linha="modal.linha"
      :gravar-na-api="false"
      @fechar="modal = null"
      @salvo="aoSalvarObservacao"
    />

    <FrequenciaModalPendencia
      v-if="nomesPendentes"
      :nomes="nomesPendentes"
      @fechar="fecharPendencias"
    />

    <ModalConfirmacao
      :aberto="aviso.aberto.value"
      titulo="Alterações não salvas"
      titulo-aviso="Atenção"
      texto-confirmar="Sair sem salvar"
      texto-cancelar="Continuar editando"
      pergunta="Deseja sair mesmo assim?"
      @confirmar="aviso.responder(true)"
      @fechar="aviso.responder(false)"
    >
      Você alterou a frequência e ainda não salvou. Se sair agora, as alterações serão perdidas.
    </ModalConfirmacao>
  </FrequenciaPagina>
</template>

<style scoped>
.resumo {
  color: var(--fp-texto-titulo-campo);
  font-size: 14px;
  font-weight: 500;
}

.acoes {
  display: flex;
  gap: 10px;
}
</style>
