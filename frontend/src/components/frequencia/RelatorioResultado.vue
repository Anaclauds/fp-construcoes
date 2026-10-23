<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import voltarIcon from '../../assets/icons/icone-voltar.svg'
import BotaoFp from '../ui/BotaoFp.vue'
import RelatorioDocumento from './RelatorioDocumento.vue'
import { useAuth } from '../../composables/useAuth'
import { useImpressao } from '../../composables/useImpressao'
import { useToast } from '../../composables/useToast'
import { extrairMensagemErro } from '../../services/api'
import { baixarRelatorioPdf } from '../../services/frequencias.service'
import type { RelatorioCompleto, StatusFiltroRelatorio } from '../../types'
import { formatarDataHora } from '../../utils/datas'

const props = defineProps<{
  relatorio: RelatorioCompleto
  statusFiltro?: StatusFiltroRelatorio | null
}>()

const emit = defineEmits<{ voltar: [] }>()

const { usuario } = useAuth()
const { mostrarToast } = useToast()
const { imprimir } = useImpressao()

// Fixado na geração do relatório: a data/hora do papel não muda se o usuário demorar a imprimir.
const emitidoEm = formatarDataHora()
const emitidoPor = computed(() => usuario.value?.nomeCompleto ?? 'Usuário')

const semRegistros = computed(() => props.relatorio.linhas.length === 0)

/** "Relatorio-Frequencia-Valdir-Silva-2026-07-01_2026-07-31": sugestão de nome ao salvar o PDF. */
const nomeArquivo = computed(() => {
  const pessoa = props.relatorio.funcionario.nomeCompleto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const { dataInicial, dataFinal } = props.relatorio.periodo
  return `Relatorio-Frequencia-${pessoa}-${dataInicial}_${dataFinal}`
})

function imprimirRelatorio() {
  // O navegador não informa se o usuário imprimiu ou cancelou: o aviso sai quando o diálogo fecha (`afterprint`).
  imprimir(nomeArquivo.value, () => mostrarToast('Impressão concluída.', 'info'))
}

const baixando = shallowRef(false)

/** PDF gerado pelo backend com os mesmos filtros do relatório; o aviso só sai após o download iniciar. */
async function baixarPdf() {
  if (baixando.value) return
  baixando.value = true
  try {
    const { funcionario, periodo } = props.relatorio
    const pdf = await baixarRelatorioPdf({
      funcionarioId: funcionario.id,
      dataInicial: periodo.dataInicial,
      dataFinal: periodo.dataFinal,
      ...(props.statusFiltro ? { status: props.statusFiltro } : {}),
    })
    const url = URL.createObjectURL(pdf)
    const link = document.createElement('a')
    link.href = url
    link.download = `${nomeArquivo.value}.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    // Revoga depois do clique para o navegador já ter iniciado o download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    mostrarToast('PDF baixado!')
  } catch (e) {
    mostrarToast(extrairMensagemErro(e), 'erro')
  } finally {
    baixando.value = false
  }
}
</script>

<template>
  <section class="resultado">
    <header class="resultado-barra">
      <BotaoFp
        variante="link"
        tamanho="pagina"
        @click="emit('voltar')"
      >
        <template #icone>
          <img
            :src="voltarIcon"
            alt=""
            width="20"
            height="20"
          >
        </template>
        Voltar
      </BotaoFp>

      <div class="resultado-acoes">
        <BotaoFp
          variante="secundario"
          tamanho="pagina"
          :desabilitado="semRegistros"
          :title="semRegistros ? 'Não há registros para imprimir' : undefined"
          @click="imprimirRelatorio"
        >
          <template #icone>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              class="icone-traco"
            >
              <path d="M7 9V3.5h10V9M7 17H4.5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 4.5 9h15a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H17" />
              <path d="M7 14h10v6.5H7z" />
            </svg>
          </template>
          Imprimir
        </BotaoFp>
        <BotaoFp
          tamanho="pagina"
          :desabilitado="semRegistros"
          :carregando="baixando"
          :title="semRegistros ? 'Não há registros para exportar' : undefined"
          @click="baixarPdf"
        >
          <template #icone>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              class="icone-traco"
            >
              <path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15" />
            </svg>
          </template>
          Baixar PDF
        </BotaoFp>
      </div>
    </header>

    <!-- Pré-visualização do papel; rola dentro da janela quando o período é longo. -->
    <div
      class="resultado-janela"
      tabindex="0"
      role="region"
      aria-label="Pré-visualização do relatório"
    >
      <RelatorioDocumento
        class="resultado-papel"
        :relatorio="relatorio"
        :emitido-em="emitidoEm"
        :emitido-por="emitidoPor"
        :status-filtro="statusFiltro"
      />
    </div>

    <!-- Cópia para a impressora: fora do #app (que some no @media print) e invisível na tela. -->
    <Teleport to="body">
      <div class="fp-area-impressao">
        <RelatorioDocumento
          impressao
          :relatorio="relatorio"
          :emitido-em="emitidoEm"
          :emitido-por="emitidoPor"
          :status-filtro="statusFiltro"
        />
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.resultado {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resultado-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.resultado-acoes {
  display: flex;
  gap: 12px;
  /* Reserva o espaço do logo fixo no canto superior direito, como o botão do cabeçalho de página. */
  margin-right: 90px;
}

.icone-traco {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.resultado-janela {
  flex: 1;
  min-height: 420px;

  padding: 24px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #eef0f2;
  box-shadow: var(--fp-sombra-card);
  overflow: auto;
}

.resultado-janela:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.resultado-papel {
  max-width: 930px;
  margin: 0 auto;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

@media (max-width: 900px) {
  .resultado-acoes {
    margin-right: 0;
  }
}
</style>
