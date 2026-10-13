<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import RelatorioFiltros, { type FiltrosEscolhidos } from '../../components/frequencia/RelatorioFiltros.vue'
import RelatorioResultado from '../../components/frequencia/RelatorioResultado.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import { useTodosFuncionarios } from '../../composables/useTodosFuncionarios'
import { extrairMensagemErro } from '../../services/api'
import { buscarRelatorio } from '../../services/frequencias.service'
import type { RelatorioCompleto, StatusFiltroRelatorio } from '../../types'
import { hojeIso } from '../../utils/datas'
import { montarRelatorio } from '../../utils/frequencia'

const router = useRouter()

const {
  funcionarios,
  carregando: carregandoFuncionarios,
  erro: erroFuncionarios,
  somenteAtivos,
  carregar,
} = useTodosFuncionarios()

const relatorio = shallowRef<RelatorioCompleto | null>(null)
const statusFiltro = shallowRef<StatusFiltroRelatorio | null>(null)
const gerando = shallowRef(false)
const erro = shallowRef<string | null>(null)

async function gerar(filtros: FiltrosEscolhidos) {
  gerando.value = true
  erro.value = null
  try {
    const hoje = hojeIso()
    const { funcionarioId, dataInicial, dataFinal, status } = filtros
    // A API só conhece os status lançados e não devolve dias futuros: "Não registrado" é completado aqui.
    const resposta = await buscarRelatorio({
      funcionarioId,
      dataInicial,
      // Período todo no futuro: segue o original só para a API devolver o funcionário (sem registros).
      dataFinal: dataFinal < hoje || dataInicial > hoje ? dataFinal : hoje,
      ...(status && status !== 'NAO_REGISTRADO' ? { status } : {}),
    })
    relatorio.value = montarRelatorio(
      { ...resposta, periodo: { dataInicial, dataFinal } },
      status,
      hoje,
    )
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
