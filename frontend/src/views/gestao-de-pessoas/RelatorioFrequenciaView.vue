<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import RelatorioFiltros, { type FiltrosEscolhidos } from '../../components/frequencia/RelatorioFiltros.vue'
import RelatorioResultado from '../../components/frequencia/RelatorioResultado.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import { useTodosFuncionarios } from '../../composables/useTodosFuncionarios'
import { extrairMensagemErro } from '../../services/api'
import { buscarRelatorio } from '../../services/frequencias.service'
import type { RelatorioFrequencia, StatusFrequencia } from '../../types'

const router = useRouter()

const {
  funcionarios,
  carregando: carregandoFuncionarios,
  erro: erroFuncionarios,
  somenteAtivos,
  carregar,
} = useTodosFuncionarios()

const relatorio = shallowRef<RelatorioFrequencia | null>(null)
const statusFiltro = shallowRef<StatusFrequencia | null>(null)
const gerando = shallowRef(false)
const erro = shallowRef<string | null>(null)

async function gerar(filtros: FiltrosEscolhidos) {
  gerando.value = true
  erro.value = null
  try {
    relatorio.value = await buscarRelatorio({
      funcionarioId: filtros.funcionarioId,
      dataInicial: filtros.dataInicial,
      dataFinal: filtros.dataFinal,
      ...(filtros.status ? { status: filtros.status } : {}),
    })
    statusFiltro.value = filtros.status
  } catch (e) {
    erro.value = extrairMensagemErro(e)
  } finally {
    gerando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Relatório de Frequência"
      :subtitulo="relatorio ? 'Confira o relatório antes de imprimir ou salvar em PDF' : 'Escolha o funcionário e o período para gerar o relatório'"
    />

    <RelatorioResultado
      v-if="relatorio"
      :relatorio="relatorio"
      :status-filtro="statusFiltro"
      @voltar="relatorio = null"
    />
    <!-- v-show: ao voltar do resultado, os filtros continuam preenchidos. -->
    <div
      v-show="!relatorio"
      class="filtros-area"
    >
      <p
        v-if="erroFuncionarios"
        class="erro"
        role="alert"
      >
        {{ erroFuncionarios }}
        <button
          type="button"
          class="erro-tentar"
          @click="carregar"
        >
          Tentar novamente
        </button>
      </p>

      <p
        v-if="somenteAtivos"
        class="aviso-lista"
      >
        Sem acesso ao cadastro de funcionários: a lista mostra apenas os funcionários ativos.
      </p>

      <RelatorioFiltros
        :funcionarios="funcionarios"
        :carregando-funcionarios="carregandoFuncionarios"
        :gerando="gerando"
        :erro-geral="erro"
        @gerar="gerar"
        @cancelar="router.push({ name: 'frequencia' })"
      />
    </div>
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

.filtros-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.aviso-lista {
  margin: 0;
  color: #717182;
  font-size: 13px;
}

.erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.erro-tentar {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
</style>
