<script lang="ts">
export interface OpcaoAutocomplete {
  valor: string
  rotulo: string
  /** Linha de apoio abaixo do rótulo (ex.: cidade e documento do cliente). */
  detalhe?: string
  desabilitado?: boolean
  /** Motivo exibido ao lado de uma opção desabilitada (ex.: "já adicionado"). */
  motivo?: string
}
</script>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import buscaIcon from '../../assets/icons/icone-busca.svg'
import selectIcon from '../../assets/icons/icone-select.svg'
import { normalizarTexto } from '../../utils/formatadores'

const props = withDefaults(
  defineProps<{
    rotulo: string
    obrigatorio?: boolean
    placeholder?: string
    erro?: string
    /** Texto de apoio discreto abaixo do campo. */
    apoio?: string
    desabilitado?: boolean
    opcoes: OpcaoAutocomplete[]
    /** Rótulo do item selecionado quando ele não está em `opcoes` (ex.: cliente de uma busca anterior). */
    rotuloSelecionado?: string
    /** `local` filtra `opcoes` pelo texto; `servidor` mostra `opcoes` como vieram e avisa `buscar` a cada digitação. */
    filtro?: 'local' | 'servidor'
    carregando?: boolean
    textoVazio?: string
    icone?: 'lupa' | 'seta'
    /** Permite limpar a seleção (botão X). */
    limpavel?: boolean
    maxlength?: number
  }>(),
  { filtro: 'local', textoVazio: 'Nenhum resultado.', icone: 'seta', placeholder: '' },
)

const emit = defineEmits<{
  /** Texto digitado (no modo `servidor` quem usa faz a busca, com debounce). */
  buscar: [texto: string]
  /** Abriu a lista (ex.: carregar os primeiros resultados). */
  abrir: []
}>()

const selecionado = defineModel<string>({ default: '' })

const id = useId()
const idLista = `${id}-lista`
const idErro = `${id}-erro`
const idApoio = `${id}-apoio`
const entrada = useTemplateRef<HTMLInputElement>('entrada')

const aberto = shallowRef(false)
const editando = shallowRef(false)
const consulta = shallowRef('')
const indiceAtivo = shallowRef(-1)

const opcaoSelecionada = computed(() => props.opcoes.find((o) => o.valor === selecionado.value))
const textoSelecionado = computed(() => opcaoSelecionada.value?.rotulo ?? props.rotuloSelecionado ?? '')
const textoExibido = computed(() => (editando.value ? consulta.value : textoSelecionado.value))

const visiveis = computed(() => {
  if (props.filtro === 'servidor' || !editando.value || consulta.value.trim() === '') return props.opcoes
  const termo = normalizarTexto(consulta.value)
  return props.opcoes.filter((o) => normalizarTexto(`${o.rotulo} ${o.detalhe ?? ''}`).includes(termo))
})

const descricao = computed(() => [props.erro ? idErro : '', props.apoio ? idApoio : ''].filter(Boolean).join(' ') || undefined)
const idAtivo = computed(() => (indiceAtivo.value >= 0 ? `${id}-opcao-${indiceAtivo.value}` : undefined))

function abrir() {
  if (props.desabilitado || aberto.value) return
  aberto.value = true
  indiceAtivo.value = -1
  emit('abrir')
}

function aoFocar(evento: FocusEvent) {
  abrir()
  // Seleciona o texto para que digitar substitua a seleção atual.
  ;(evento.target as HTMLInputElement).select()
}

function aoDigitar(evento: Event) {
  consulta.value = (evento.target as HTMLInputElement).value
  editando.value = true
  aberto.value = true
  indiceAtivo.value = visiveis.value.findIndex((o) => !o.desabilitado)
  emit('buscar', consulta.value)
}

function aoSair() {
  aberto.value = false
  editando.value = false
  consulta.value = ''
}

function escolher(opcao: OpcaoAutocomplete) {
  if (opcao.desabilitado) return
  selecionado.value = opcao.valor
  aoSair()
}

function mover(passo: 1 | -1) {
  const lista = visiveis.value
  if (lista.length === 0) return
  let i = indiceAtivo.value
  for (let tentativa = 0; tentativa < lista.length; tentativa++) {
    i = (i + passo + lista.length) % lista.length
    if (!lista[i]!.desabilitado) {
      indiceAtivo.value = i
      break
    }
  }
  void nextTick(() => document.getElementById(`${id}-opcao-${indiceAtivo.value}`)?.scrollIntoView({ block: 'nearest' }))
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
    evento.preventDefault()
    if (!aberto.value) abrir()
    mover(evento.key === 'ArrowDown' ? 1 : -1)
  } else if (evento.key === 'Enter' && aberto.value) {
    // Dentro de um formulário, Enter escolhe a opção em vez de enviar.
    evento.preventDefault()
    const opcao = visiveis.value[indiceAtivo.value]
    if (opcao) escolher(opcao)
  } else if (evento.key === 'Escape' && aberto.value) {
    // Fecha só a lista (não o modal em volta).
    evento.stopPropagation()
    aoSair()
  }
}

function limpar() {
  selecionado.value = ''
  consulta.value = ''
  entrada.value?.focus()
}
</script>

<template>
  <div class="autocomplete">
    <label
      :for="id"
      class="autocomplete-rotulo"
    >
      <span>{{ rotulo }}</span><span
        v-if="obrigatorio"
        class="autocomplete-obrigatorio"
        aria-hidden="true"
      >*</span>
    </label>

    <div class="autocomplete-controle">
      <img
        v-if="icone === 'lupa'"
        :src="buscaIcon"
        alt=""
        width="16"
        height="16"
        class="autocomplete-lupa"
      >
      <input
        :id="id"
        ref="entrada"
        class="autocomplete-input"
        :class="{
          'autocomplete-input--invalido': erro,
          'autocomplete-input--lupa': icone === 'lupa',
          'autocomplete-input--vazio': !editando && !textoSelecionado,
        }"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :value="textoExibido"
        :placeholder="placeholder"
        :disabled="desabilitado"
        :maxlength="maxlength"
        :aria-expanded="aberto"
        :aria-controls="aberto ? idLista : undefined"
        :aria-activedescendant="idAtivo"
        :aria-required="obrigatorio || undefined"
        :aria-invalid="erro ? true : undefined"
        :aria-describedby="descricao"
        @focus="aoFocar"
        @click="abrir"
        @input="aoDigitar"
        @keydown="aoTeclar"
        @blur="aoSair"
      >
      <button
        v-if="limpavel && selecionado && !desabilitado"
        type="button"
        class="autocomplete-limpar"
        aria-label="Limpar seleção"
        @mousedown.prevent
        @click="limpar"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <img
        v-else-if="icone === 'seta'"
        :src="selectIcon"
        alt=""
        width="19"
        height="19"
        class="autocomplete-seta"
      >

      <ul
        v-if="aberto"
        :id="idLista"
        class="autocomplete-lista"
        role="listbox"
        :aria-label="rotulo"
      >
        <li
          v-if="carregando"
          class="autocomplete-aviso"
          role="presentation"
        >
          Buscando...
        </li>
        <li
          v-else-if="visiveis.length === 0"
          class="autocomplete-aviso"
          role="presentation"
        >
          {{ textoVazio }}
        </li>
        <li
          v-for="(opcao, i) in visiveis"
          :id="`${id}-opcao-${i}`"
          :key="opcao.valor"
          class="autocomplete-opcao"
          :class="{
            'autocomplete-opcao--ativa': i === indiceAtivo,
            'autocomplete-opcao--selecionada': opcao.valor === selecionado,
            'autocomplete-opcao--desabilitada': opcao.desabilitado,
          }"
          role="option"
          :aria-selected="opcao.valor === selecionado"
          :aria-disabled="opcao.desabilitado || undefined"
          @mousedown.prevent
          @click="escolher(opcao)"
          @mousemove="indiceAtivo = opcao.desabilitado ? indiceAtivo : i"
        >
          <span class="autocomplete-opcao-rotulo">{{ opcao.rotulo }}</span>
          <span
            v-if="opcao.motivo && opcao.desabilitado"
            class="autocomplete-opcao-motivo"
          >{{ opcao.motivo }}</span>
          <span
            v-else-if="opcao.detalhe"
            class="autocomplete-opcao-detalhe"
          >{{ opcao.detalhe }}</span>
        </li>
      </ul>
    </div>

    <p
      v-if="erro"
      :id="idErro"
      class="autocomplete-erro"
      role="alert"
    >
      {{ erro }}
    </p>
    <p
      v-else-if="apoio"
      :id="idApoio"
      class="autocomplete-apoio"
    >
      {{ apoio }}
    </p>
  </div>
</template>

<style scoped>
.autocomplete {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.autocomplete-rotulo {
  display: flex;
  align-items: baseline;
  gap: 3px;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.autocomplete-obrigatorio {
  color: var(--fp-obrigatorio);
}

.autocomplete-controle {
  position: relative;
}

.autocomplete-input {
  width: 100%;
  height: var(--campo-altura, 42px);

  padding: 0 40px 0 14px;
  border: 1.2px solid var(--fp-verde-30);
  border-radius: 9px;
  background-color: #fff;

  color: #222;
  font-family: inherit;
  font-size: 16px;
  text-overflow: ellipsis;
}

.autocomplete-input--lupa {
  padding-left: 44px;
}

.autocomplete-input::placeholder {
  color: #717182;
}

.autocomplete-input:focus {
  outline: none;
  border-color: var(--fp-verde);
  box-shadow: var(--fp-foco);
}

.autocomplete-input:disabled {
  background-color: rgba(229, 231, 235, 0.3);
  color: #6b7280;
  cursor: not-allowed;
}

.autocomplete-input--invalido,
.autocomplete-input--invalido:focus {
  border-color: var(--fp-vermelho);
}

.autocomplete-lupa {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.autocomplete-seta {
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.autocomplete-limpar {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);

  width: 28px;
  height: 28px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
}

.autocomplete-limpar svg {
  fill: none;
  stroke: #6b7280;
  stroke-width: 2.2;
  stroke-linecap: round;
}

.autocomplete-limpar:hover {
  background-color: var(--fp-cinza-fundo);
}

.autocomplete-limpar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.autocomplete-lista {
  position: absolute;
  z-index: 30;
  top: calc(100% + 4px);
  left: 0;
  right: 0;

  /* Nunca maior que a tela: no celular com teclado aberto a lista encolhe em vez de sair da viewport. */
  max-width: calc(100vw - 32px);
  max-height: min(248px, 40vh);
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;

  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.18);
}

.autocomplete-opcao {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  border-radius: 7px;
  color: #333;
  font-size: 14px;
  cursor: pointer;
}

.autocomplete-opcao--ativa {
  background-color: var(--fp-verde-10);
}

.autocomplete-opcao--selecionada .autocomplete-opcao-rotulo {
  color: var(--fp-verde);
  font-weight: 600;
}

.autocomplete-opcao--desabilitada {
  color: #9ca3af;
  cursor: not-allowed;
}

.autocomplete-opcao-detalhe,
.autocomplete-opcao-motivo {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.autocomplete-aviso {
  padding: 10px 12px;
  color: #6b7280;
  font-size: 13px;
}

.autocomplete-erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 12.5px;
  font-weight: 500;
}

.autocomplete-apoio {
  margin: 0;
  color: #717182;
  font-size: 12.5px;
}
</style>
