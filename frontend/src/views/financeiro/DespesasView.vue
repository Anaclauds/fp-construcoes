<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import DespesaFiltros from '../../components/despesas/DespesaFiltros.vue'
import DespesaModalEstornar from '../../components/despesas/DespesaModalEstornar.vue'
import DespesaModalFormulario from '../../components/despesas/DespesaModalFormulario.vue'
import DespesaModalVisualizar from '../../components/despesas/DespesaModalVisualizar.vue'
import DespesaResumo from '../../components/despesas/DespesaResumo.vue'
import DespesaTabela from '../../components/despesas/DespesaTabela.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useCategoriasDespesa } from '../../composables/useCategoriasDespesa'
import { useListaDespesas } from '../../composables/useListaDespesas'
import { useToast } from '../../composables/useToast'
import type { Despesa } from '../../types/despesa'

type Modal = { tipo: 'visualizar' | 'editar' | 'estornar'; despesa: Despesa } | { tipo: 'nova' } | null

const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('DESPESAS', 'gerenciar'))

const lista = useListaDespesas()
const categorias = useCategoriasDespesa()

const modal = shallowRef<Modal>(null)

function fecharModal() {
  modal.value = null
}

async function aoSalvar(_despesa: Despesa, edicao: boolean) {
  fecharModal()
  mostrarToast('Salvo com sucesso!')
  // Despesa nova cai no topo (ordem por data): volta à primeira página para vê-la, se o filtro a incluir.
  if (!edicao && lista.pagina.value !== 1) lista.pagina.value = 1
  else await lista.carregar()
}

/** Estorno confirmado pela API: fecha o modal e recarrega a lista (os totais e a despesa estornada mudam). */
async function aoEstornar() {
  fecharModal()
  mostrarToast('Despesa estornada.')
  await lista.carregar()
}

/** A API recusou por conflito: o modal mostra o motivo e a lista é atualizada por baixo, sem reenviar nada. */
function aoConflito() {
  void lista.carregar()
}

onMounted(() => {
  void categorias.carregar()
  void lista.carregar()
})
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Despesa"
      subtitulo="Registre e acompanhe todos os gastos da empresa"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="modal = { tipo: 'nova' }"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Nova Despesa
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <DespesaFiltros
      v-model:busca="lista.busca.value"
      v-model:categoria="lista.categoria.value"
      v-model:tipo="lista.tipo.value"
      v-model:data-inicio="lista.dataInicio.value"
      v-model:data-fim="lista.dataFim.value"
      :erro-inicio="lista.erroInicio.value"
      :erro-fim="lista.erroFim.value"
      :tem-filtros="lista.temFiltros.value"
      @limpar="lista.limparFiltros"
    />

    <DespesaResumo
      :indicadores="lista.indicadores.value"
      :filtrada="lista.temFiltros.value"
    />

    <DespesaTabela
      v-model:pagina="lista.pagina.value"
      :despesas="lista.despesas.value"
      :total="lista.total.value"
      :por-pagina="lista.porPagina"
      :carregando="lista.carregando.value"
      :erro="lista.erro.value"
      :pode-gerenciar="podeGerenciar"
      :filtrada="lista.temFiltros.value"
      @visualizar="(despesa) => (modal = { tipo: 'visualizar', despesa })"
      @editar="(despesa) => (modal = { tipo: 'editar', despesa })"
      @tentar-novamente="lista.carregar"
    />

    <DespesaModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :despesa="modal.despesa"
      :pode-gerenciar="podeGerenciar"
      @fechar="fecharModal"
      @estornar="(despesa) => (modal = { tipo: 'estornar', despesa })"
    />
    <DespesaModalEstornar
      v-else-if="modal?.tipo === 'estornar'"
      :key="modal.despesa.id"
      :despesa="modal.despesa"
      @fechar="fecharModal"
      @estornada="aoEstornar"
      @conflito="aoConflito"
    />
    <DespesaModalFormulario
      v-else-if="modal?.tipo === 'nova'"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <DespesaModalFormulario
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.despesa.id"
      :despesa="modal.despesa"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}
</style>
