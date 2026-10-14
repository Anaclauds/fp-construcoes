<script setup lang="ts" generic="T">
import { computed, onMounted, onUpdated, useTemplateRef } from 'vue'
import anteriorIcon from '../../assets/icons/icone-pagina-anterior.svg'
import proximaIcon from '../../assets/icons/icone-pagina-proxima.svg'

export interface ColunaTabela {
  /** Nome do slot da célula: `#celula-<chave>="{ linha }"`. Sem slot, mostra `linha[chave]`. */
  chave: string
  rotulo: string
  /** Largura CSS da coluna (ex.: '30%'). */
  largura?: string
}

const props = withDefaults(
  defineProps<{
    colunas: ColunaTabela[]
    /** Linhas da página atual (a paginação em si é de quem usa o componente). */
    linhas: T[]
    chaveLinha: (linha: T) => string | number
    /** Total de registros em todas as páginas. */
    total: number
    porPagina?: number
    carregando?: boolean
    erro?: string | null
    textoVazio?: string
    /** Rótulo da tabela para leitores de tela. */
    rotulo?: string
    /** Classe extra da linha (ex.: destacar linhas com pendência). */
    classeLinha?: (linha: T) => string | undefined
    /** A linha inteira é clicável (emite `abrir-linha`); a célula principal deve trazer um link/botão para o teclado. */
    linhaClicavel?: boolean
  }>(),
  {
    porPagina: 8,
    carregando: false,
    erro: null,
    textoVazio: 'Nenhum registro encontrado.',
    rotulo: 'Resultados',
    linhaClicavel: false,
  },
)

const emit = defineEmits<{ 'tentar-novamente': []; 'abrir-linha': [linha: T] }>()

const pagina = defineModel<number>('pagina', { default: 1 })

const totalPaginas = computed(() => Math.max(1, Math.ceil(props.total / props.porPagina)))

// Até 5 páginas numeradas, com a atual no centro quando possível.
const paginasVisiveis = computed(() => {
  const maximo = 5
  const inicio = Math.max(1, Math.min(pagina.value - 2, totalPaginas.value - maximo + 1))
  const fim = Math.min(totalPaginas.value, inicio + maximo - 1)
  return Array.from({ length: fim - inicio + 1 }, (_, i) => inicio + i)
})

const resumo = computed(() => {
  const n = props.linhas.length
  return `Mostrando ${n} de ${props.total} ${props.total === 1 ? 'registro' : 'registros'}`
})

function ir(destino: number) {
  if (destino >= 1 && destino <= totalPaginas.value) pagina.value = destino
}

/** Lista sem nenhum registro (vazia ou com erro): sem "Mostrando 0 de 0" nem paginação. */
const semRegistros = computed(() => props.total === 0 && props.linhas.length === 0)

function aoClicarLinha(evento: MouseEvent, linha: T) {
  if (!props.linhaClicavel) return
  // Cliques em links/botões da própria linha mantêm o comportamento deles.
  if ((evento.target as HTMLElement).closest('a, button, input, select, textarea, label')) return
  emit('abrir-linha', linha)
}

// Texto longo é cortado com reticências; o texto completo fica no `title` (hover) de cada célula de texto.
const SELETOR_TEXTO = '.celula-principal, .celula-secundaria, .celula-corte, .fp-celula-nome'
const corpo = useTemplateRef<HTMLElement>('corpo')

function atualizarTitulos() {
  const raiz = corpo.value
  if (!raiz) return
  const alvos = [
    ...raiz.querySelectorAll<HTMLElement>(SELETOR_TEXTO),
    // Células simples (sem slot) não têm elementos filhos.
    ...Array.from(raiz.querySelectorAll<HTMLElement>('tbody td')).filter((td) => td.childElementCount === 0),
  ]
  for (const alvo of alvos) {
    // Título definido por quem usa a tabela vence o automático.
    if (alvo.hasAttribute('title') && alvo.dataset.tituloAuto !== '1') continue
    const texto = alvo.textContent?.trim() ?? ''
    if (texto) {
      if (alvo.title !== texto) alvo.title = texto
      alvo.dataset.tituloAuto = '1'
    } else {
      alvo.removeAttribute('title')
      delete alvo.dataset.tituloAuto
    }
  }
}

onMounted(atualizarTitulos)
onUpdated(atualizarTitulos)

function valorPadrao(linha: T, chave: string): string {
  const valor = (linha as Record<string, unknown>)[chave]
  return valor === null || valor === undefined ? '' : String(valor)
}
</script>

<template>
  <section class="tabela-card">
    <div
      ref="corpo"
      class="tabela-corpo"
      :aria-busy="carregando"
    >
      <table :aria-label="rotulo">
        <colgroup>
          <col
            v-for="coluna in colunas"
            :key="coluna.chave"
            :style="{ width: coluna.largura }"
          >
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="coluna in colunas"
              :key="coluna.chave"
              scope="col"
            >
              {{ coluna.rotulo }}
            </th>
          </tr>
        </thead>
        <tbody v-if="!erro && linhas.length > 0">
          <tr
            v-for="linha in linhas"
            :key="chaveLinha(linha)"
            :class="[classeLinha?.(linha), { 'tabela-linha--clicavel': linhaClicavel }]"
            @click="aoClicarLinha($event, linha)"
          >
            <td
              v-for="coluna in colunas"
              :key="coluna.chave"
            >
              <slot
                :name="`celula-${coluna.chave}`"
                :linha="linha"
              >
                {{ valorPadrao(linha, coluna.chave) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="erro"
        class="tabela-mensagem tabela-mensagem--erro"
        role="alert"
      >
        {{ erro }}
        <button
          type="button"
          class="tabela-tentar"
          @click="emit('tentar-novamente')"
        >
          Tentar novamente
        </button>
      </p>
      <p
        v-else-if="carregando && linhas.length === 0"
        class="tabela-mensagem"
        role="status"
      >
        Carregando...
      </p>
      <p
        v-else-if="linhas.length === 0"
        class="tabela-mensagem"
      >
        {{ textoVazio }}
      </p>
    </div>

    <!-- Rodapé próprio (ex.: folha de frequência, sem paginação); sem o slot, mostra resumo + paginação. -->
    <footer
      v-if="$slots.rodape"
      class="tabela-rodape"
    >
      <slot name="rodape" />
    </footer>
    <footer
      v-else-if="!semRegistros"
      class="tabela-rodape"
    >
      <span
        class="tabela-resumo"
        aria-live="polite"
      >{{ resumo }}</span>

      <nav
        class="paginacao"
        aria-label="Paginação"
      >
        <button
          type="button"
          class="paginacao-botao"
          aria-label="Página anterior"
          :disabled="pagina <= 1"
          @click="ir(pagina - 1)"
        >
          <img
            :src="anteriorIcon"
            alt=""
            width="7"
            height="12"
          >
        </button>
        <button
          v-for="numero in paginasVisiveis"
          :key="numero"
          type="button"
          class="paginacao-botao paginacao-botao--numero"
          :class="{ 'paginacao-botao--atual': numero === pagina }"
          :aria-label="`Página ${numero}`"
          :aria-current="numero === pagina ? 'page' : undefined"
          @click="ir(numero)"
        >
          {{ numero }}
        </button>
        <button
          type="button"
          class="paginacao-botao"
          aria-label="Próxima página"
          :disabled="pagina >= totalPaginas"
          @click="ir(pagina + 1)"
        >
          <img
            :src="proximaIcon"
            alt=""
            width="7"
            height="12"
          >
        </button>
      </nav>
    </footer>
  </section>
</template>

<style scoped>
/* Ocupa a altura restante da página; o corpo rola por dentro quando há muitas linhas. */
.tabela-card {
  flex: 1 1 0;
  min-height: 360px;

  display: flex;
  flex-direction: column;

  border: 1.5px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
  overflow: hidden;
}

.tabela-corpo {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

table {
  width: 100%;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;

  height: 42px;
  padding: 0 16px;
  border-bottom: 1px solid var(--fp-cinza-borda);
  background-color: var(--fp-cinza-fundo);

  color: var(--fp-cinza-rotulo);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.27px;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

td {
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid #f0f1f3;

  color: var(--fp-texto-corpo);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

td :deep(.fp-celula-nome) {
  display: block;
}

tbody tr:hover td {
  background-color: #fbfcfb;
}

.tabela-linha--clicavel {
  cursor: pointer;
}

/* Textos de célula (classes usadas pelas telas) cortam com reticências em vez de vazar ou sumir. */
td :deep(.celula-principal),
td :deep(.celula-secundaria),
td :deep(.celula-corte),
td :deep(.fp-celula-nome) {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tabela-mensagem {
  margin: 0;
  padding: 40px 16px;

  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.tabela-mensagem--erro {
  color: var(--fp-vermelho-escuro);
}

.tabela-tentar {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.tabela-rodape {
  min-height: 63px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  padding: 11px 16px;
  border-top: 1px solid var(--fp-cinza-borda);
}

.tabela-resumo {
  color: var(--fp-texto-titulo-campo);
  font-size: 14px;
  font-weight: 500;
}

.paginacao {
  display: flex;
  align-items: center;
  gap: 8px;
}

.paginacao-botao {
  min-width: 37px;
  height: 41px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0 10px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;

  color: var(--fp-texto-titulo-campo);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.paginacao-botao:hover:not(:disabled):not(.paginacao-botao--atual) {
  background-color: var(--fp-cinza-fundo);
}

.paginacao-botao:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.paginacao-botao--atual {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde);
  color: #fff;
}

.paginacao-botao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}
</style>
