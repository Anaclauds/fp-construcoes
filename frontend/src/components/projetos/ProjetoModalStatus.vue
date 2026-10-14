<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import { extrairErro } from '../../services/api'
import { alterarStatusProjeto } from '../../services/projetos.service'
import type { ProjetoResumo, StatusFinalProjeto } from '../../types/projeto'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import { mensagemProjeto } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'

const props = defineProps<{ projeto: ProjetoResumo }>()

const emit = defineEmits<{
  fechar: []
  atualizado: [status: StatusFinalProjeto]
  /** O backend indicou que o projeto mudou (já concluído, cancelado...): a lista precisa recarregar. */
  desatualizado: []
}>()

interface OpcaoStatus {
  valor: StatusFinalProjeto
  titulo: string
  descricao: string
  efeitos: string[]
}

// Efeitos descritos conforme o backend: concluir baixa as reservas de estoque e grava a data de conclusão;
// cancelar libera as reservas; nenhum dos dois mexe nas cobranças já geradas.
const opcoes: OpcaoStatus[] = [
  {
    valor: 'CONCLUIDO',
    titulo: 'Concluir projeto',
    descricao: 'A obra foi finalizada.',
    efeitos: [
      'A data de conclusão passa a ser hoje.',
      'O estoque reservado para o projeto é baixado: os materiais saem do estoque definitivamente.',
      'As cobranças e parcelas continuam como estão.',
    ],
  },
  {
    valor: 'CANCELADO',
    titulo: 'Cancelar projeto',
    descricao: 'A obra não será mais executada.',
    efeitos: [
      'O estoque reservado para o projeto é liberado e volta a ficar disponível.',
      'As cobranças já geradas NÃO são canceladas: acerte os valores em Cobranças, se necessário.',
      'Um projeto cancelado não pode ser reaberto.',
    ],
  },
]

const idGrupo = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const escolha = shallowRef<StatusFinalProjeto | null>(null)
const enviando = shallowRef(false)
const erro = shallowRef<string | null>(null)

const opcaoEscolhida = computed(() => opcoes.find((opcao) => opcao.valor === escolha.value) ?? null)
const cancelando = computed(() => escolha.value === 'CANCELADO')

function escolher(valor: StatusFinalProjeto) {
  escolha.value = valor
  erro.value = null
}

async function confirmar() {
  if (enviando.value) return
  if (!escolha.value) {
    erro.value = 'Escolha o novo status do projeto.'
    await nextTick()
    raiz.value?.querySelector<HTMLElement>('button[role="radio"]')?.focus()
    return
  }

  enviando.value = true
  erro.value = null
  try {
    await alterarStatusProjeto(props.projeto.id, escolha.value)
    emit('atualizado', escolha.value)
  } catch (e) {
    const { mensagem } = extrairErro(e)
    erro.value = mensagemProjeto(mensagem)
    if (/somente projeto em execucao|projeto nao encontrado/i.test(mensagem)) emit('desatualizado')
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Atualizar Status do Projeto"
    :subtitulo="`${formatarNumeroOrcamento(projeto.orcamento.numero)} · ${projeto.orcamento.titulo}`"
    :variante="cancelando ? 'vermelho' : 'verde'"
    :icone="cancelando ? 'x' : 'check'"
    largura="672px"
    :bloqueado="enviando"
    @fechar="emit('fechar')"
  >
    <form
      ref="raiz"
      class="status"
      novalidate
      @submit.prevent="confirmar"
    >
      <p
        :id="idGrupo"
        class="status-pergunta"
      >
        Para qual status deseja atualizar este projeto?
      </p>

      <div
        class="opcoes"
        role="radiogroup"
        :aria-labelledby="idGrupo"
      >
        <button
          v-for="opcao in opcoes"
          :key="opcao.valor"
          type="button"
          role="radio"
          class="opcao"
          :class="[`opcao--${opcao.valor.toLowerCase()}`, { 'opcao--ativa': escolha === opcao.valor }]"
          :aria-checked="escolha === opcao.valor"
          @click="escolher(opcao.valor)"
        >
          <span class="opcao-marca">
            <svg
              v-if="opcao.valor === 'CONCLUIDO'"
              viewBox="0 0 24 24"
              aria-hidden="true"
            ><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              aria-hidden="true"
            ><path d="M7 7l10 10M17 7L7 17" /></svg>
          </span>
          <span class="opcao-textos">
            <span class="opcao-titulo">{{ opcao.titulo }}</span>
            <span class="opcao-descricao">{{ opcao.descricao }}</span>
          </span>
        </button>
      </div>

      <section
        v-if="opcaoEscolhida"
        class="efeitos"
        :class="{ 'efeitos--perigo': cancelando }"
        aria-live="polite"
      >
        <h3 class="efeitos-titulo">
          O que acontece ao {{ cancelando ? 'cancelar' : 'concluir' }}
        </h3>
        <ul>
          <li
            v-for="efeito in opcaoEscolhida.efeitos"
            :key="efeito"
          >
            {{ efeito }}
          </li>
        </ul>
      </section>

      <ProjetoAvisoErro
        v-if="erro"
        :mensagem="erro"
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
        :variante="cancelando ? 'perigo' : 'primario'"
        :carregando="enviando"
        @click="confirmar"
      >
        {{ cancelando ? 'Confirmar cancelamento' : escolha ? 'Confirmar conclusão' : 'Confirmar' }}
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.status {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.status-pergunta {
  margin: 0;
  color: #333;
  font-size: 15px;
  font-weight: 500;
}

.opcoes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.opcao {
  display: flex;
  align-items: center;
  gap: 14px;

  padding: 16px 18px;
  border: 1.5px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;

  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.opcao:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.opcao-marca {
  width: 40px;
  height: 40px;
  flex-shrink: 0;

  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.opcao-marca svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.opcao--concluido .opcao-marca {
  background-color: #dcfce7;
  color: #008236;
}

.opcao--cancelado .opcao-marca {
  background-color: #fee2e2;
  color: var(--fp-vermelho);
}

.opcao--concluido:hover,
.opcao--concluido.opcao--ativa {
  border-color: var(--fp-verde);
  background-color: var(--fp-verde-10);
}

.opcao--cancelado:hover,
.opcao--cancelado.opcao--ativa {
  border-color: var(--fp-vermelho);
  background-color: #fef2f2;
}

.opcao-textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.opcao-titulo {
  color: #222;
  font-size: 15px;
  font-weight: 600;
}

.opcao-descricao {
  color: #6a7282;
  font-size: 13px;
}

.efeitos {
  padding: 14px 18px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.efeitos--perigo {
  border-color: #fca5a5;
  background-color: #fef2f2;
}

.efeitos-titulo {
  margin: 0 0 6px;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 600;
}

.efeitos--perigo .efeitos-titulo {
  color: var(--fp-vermelho-escuro);
}

.efeitos ul {
  margin: 0;
  padding-left: 18px;
  color: #4a5565;
  font-size: 13.5px;
  line-height: 1.55;
}

@media (max-width: 560px) {
  .opcoes {
    grid-template-columns: 1fr;
  }
}
</style>
