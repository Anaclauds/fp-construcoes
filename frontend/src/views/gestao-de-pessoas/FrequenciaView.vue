<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import FolhaFrequenciaTabela from '../../components/frequencia/FolhaFrequenciaTabela.vue'
import FrequenciaModalObservacao from '../../components/frequencia/FrequenciaModalObservacao.vue'
import FrequenciaModalVisualizar from '../../components/frequencia/FrequenciaModalVisualizar.vue'
import FrequenciaPagina from '../../components/frequencia/FrequenciaPagina.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import { useAuth } from '../../composables/useAuth'
import { useDataDaRota } from '../../composables/useDataDaRota'
import { useFolhaFrequencia } from '../../composables/useFolhaFrequencia'
import { useToast } from '../../composables/useToast'
import type { StatusFrequencia } from '../../types'
import { isoParaDataBr } from '../../utils/formatadores'
import { ROTULO_CURTO_STATUS, STATUS_FREQUENCIA, paraLinhaFolha, type LinhaFolha } from '../../utils/frequencia'

type FiltroFolha = 'TODOS' | 'NAO_REGISTRADO' | StatusFrequencia
type Modal = { tipo: 'visualizar' | 'observacao'; linha: LinhaFolha } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('FREQUENCIA', 'gerenciar'))
const podeVerRelatorio = computed(() => temPermissao('FREQUENCIA', 'visualizar'))

const { data, irParaData } = useDataDaRota('frequencia')
const { registros, indicadores, carregando, erro, carregar } = useFolhaFrequencia(data)

const busca = shallowRef('')
const filtro = shallowRef<FiltroFolha>('TODOS')

const opcoesFiltro: OpcaoFiltro<FiltroFolha>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  ...STATUS_FREQUENCIA.map((status) => ({ valor: status, rotulo: ROTULO_CURTO_STATUS[status] })),
  { valor: 'NAO_REGISTRADO', rotulo: 'Não registrado' },
]

const semAcento = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const todasAsLinhas = computed(() => registros.value.map(paraLinhaFolha))

// Busca e filtro de status são locais: a API já devolve a folha inteira do dia.
const linhas = computed(() => {
  const termo = semAcento(busca.value.trim())
  return todasAsLinhas.value.filter((linha) => {
    if (filtro.value === 'NAO_REGISTRADO' ? linha.status !== null : filtro.value !== 'TODOS' && linha.status !== filtro.value) {
      return false
    }
    return !termo || semAcento(`${linha.nome} ${linha.apelido ?? ''} ${linha.funcao}`).includes(termo)
  })
})

const filtrando = computed(() => busca.value.trim() !== '' || filtro.value !== 'TODOS')

const resumo = computed(() => {
  const total = todasAsLinhas.value.length
  const plural = total === 1 ? 'funcionário' : 'funcionários'
  const contagem = filtrando.value ? `${linhas.value.length} de ${total}` : String(total)
  return `${contagem} ${plural} · ${isoParaDataBr(data.value)}`
})

const textoVazio = computed(() =>
  filtrando.value ? 'Nenhum funcionário corresponde à busca ou ao filtro.' : 'Nenhum funcionário ativo encontrado.',
)

const modal = shallowRef<Modal>(null)

function abrir(tipo: NonNullable<Modal>['tipo'], linha: LinhaFolha) {
  modal.value = { tipo, linha }
}

async function aoSalvarObservacao() {
  modal.value = null
  mostrarToast('Salvo com sucesso!')
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <FrequenciaPagina
    titulo="Consultar Frequência"
    subtitulo="Acompanhe a frequência dos funcionários dia a dia"
    :indicadores="indicadores"
    :data="data"
    @update:data="irParaData"
  >
    <template #aviso>
      <strong>Como funciona:</strong> escolha o dia para ver o status de cada funcionário; sem status
      marcado, a frequência ainda não foi registrada.
      <template v-if="podeGerenciar">
        Para registrar ou corrigir, use <strong>Editar Frequência</strong>.
      </template>
    </template>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="filtro"
      :opcoes="opcoesFiltro"
      placeholder="Buscar por nome, apelido ou função..."
    />

    <FolhaFrequenciaTabela
      :linhas="linhas"
      :editavel="false"
      :pode-gerenciar="podeGerenciar"
      :carregando="carregando"
      :erro="erro"
      :texto-vazio="textoVazio"
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
            v-if="podeVerRelatorio"
            variante="secundario"
            tamanho="pagina"
            @click="router.push({ name: 'relatorioFrequencia' })"
          >
            Emitir relatório
          </BotaoFp>
          <BotaoFp
            v-if="podeGerenciar"
            tamanho="pagina"
            @click="router.push({ name: 'frequenciaEditar', query: { data } })"
          >
            Editar Frequência
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
      gravar-na-api
      @fechar="modal = null"
      @salvo="aoSalvarObservacao"
    />
  </FrequenciaPagina>
</template>

<style scoped>
.acoes {
  display: flex;
  align-items: center;
  gap: 10px;
}

.resumo {
  color: var(--fp-texto-titulo-campo);
  font-size: 14px;
  font-weight: 500;
}
</style>
