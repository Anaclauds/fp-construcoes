<script setup lang="ts">
import { computed, shallowRef, useId } from 'vue'
import selectIcon from '../../assets/icons/icone-select.svg'

export interface OpcaoCampo {
  valor: string
  rotulo: string
}

const props = withDefaults(
  defineProps<{
    rotulo: string
    tipo?: 'texto' | 'senha' | 'select' | 'area'
    obrigatorio?: boolean
    somenteLeitura?: boolean
    desabilitado?: boolean
    placeholder?: string
    /** Texto auxiliar cinza ao lado do rótulo, ex.: "(CPF do funcionário)". */
    dica?: string
    /** Mensagem de erro de validação; liga o estado inválido do campo. */
    erro?: string
    opcoes?: OpcaoCampo[]
    autocomplete?: string
    maxlength?: number
    /** Formata o texto a cada digitação (ex.: máscara de CPF); o valor do v-model já sai mascarado. */
    mascara?: (valor: string) => string
    inputmode?: 'text' | 'numeric' | 'tel'
    /** Altura (em linhas) do campo `area`. */
    linhas?: number
  }>(),
  { tipo: 'texto', opcoes: () => [], linhas: 4 },
)

const valor = defineModel<string>({ default: '' })

const id = useId()
const idErro = `${id}-erro`
const senhaVisivel = shallowRef(false)

const typeInput = computed(() => (props.tipo === 'senha' && !senhaVisivel.value ? 'password' : 'text'))
const bloqueado = computed(() => props.somenteLeitura || props.desabilitado)

// Aviso discreto quando o texto chegou no limite (o navegador corta o excedente sem avisar).
// Campos com máscara (CPF, telefone...) têm tamanho fixo e não precisam do aviso.
const limiteAtingido = computed(
  () =>
    !!props.maxlength &&
    !props.mascara &&
    !bloqueado.value &&
    props.tipo !== 'select' &&
    valor.value.length >= props.maxlength,
)
const idLimite = `${id}-limite`
const descricao = computed(() => [props.erro ? idErro : '', limiteAtingido.value ? idLimite : ''].filter(Boolean).join(' ') || undefined)

function aoDigitar(evento: Event) {
  const input = evento.target as HTMLInputElement | HTMLTextAreaElement
  const formatado = props.mascara ? props.mascara(input.value) : input.value
  // Reescreve o DOM direto: se a máscara descartar o caractere, o v-model não mudaria e o texto digitado ficaria.
  if (formatado !== input.value) input.value = formatado
  valor.value = formatado
}
</script>

<template>
  <div class="campo">
    <label
      :for="id"
      class="campo-rotulo"
    >
      <span
        class="campo-rotulo-texto"
        :title="rotulo"
      >{{ rotulo }}</span><span
        v-if="obrigatorio"
        class="campo-obrigatorio"
        aria-hidden="true"
      >*</span>
      <span
        v-if="dica"
        class="campo-dica"
      > {{ dica }}</span>
    </label>

    <div class="campo-controle">
      <select
        v-if="tipo === 'select'"
        :id="id"
        v-model="valor"
        class="campo-input campo-select"
        :class="{ 'campo-input--invalido': erro, 'campo-input--vazio': valor === '' }"
        :disabled="bloqueado"
        :required="obrigatorio"
        :aria-invalid="erro ? true : undefined"
        :aria-describedby="erro ? idErro : undefined"
      >
        <option
          v-if="placeholder"
          value=""
        >
          {{ placeholder }}
        </option>
        <option
          v-for="opcao in opcoes"
          :key="opcao.valor"
          :value="opcao.valor"
        >
          {{ opcao.rotulo }}
        </option>
      </select>
      <img
        v-if="tipo === 'select'"
        :src="selectIcon"
        alt=""
        width="19"
        height="19"
        class="campo-seta"
      >

      <textarea
        v-else-if="tipo === 'area'"
        :id="id"
        :value="valor"
        class="campo-input campo-area"
        :class="{ 'campo-input--invalido': erro }"
        :rows="linhas"
        :readonly="somenteLeitura"
        :disabled="desabilitado"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :aria-required="obrigatorio || undefined"
        :aria-invalid="erro ? true : undefined"
        :aria-describedby="descricao"
        @input="aoDigitar"
      />

      <input
        v-else
        :id="id"
        :value="valor"
        class="campo-input"
        :class="{
          'campo-input--invalido': erro,
          'campo-input--senha': tipo === 'senha',
          'campo-input--com-fim': $slots.fim,
        }"
        :type="typeInput"
        :readonly="somenteLeitura"
        :disabled="desabilitado"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :inputmode="inputmode"
        :aria-required="obrigatorio || undefined"
        :aria-invalid="erro ? true : undefined"
        :aria-describedby="descricao"
        @input="aoDigitar"
      >

      <div
        v-if="$slots.fim"
        class="campo-fim"
      >
        <!-- Ação à direita do campo (ex.: ícone de calendário). -->
        <slot name="fim" />
      </div>

      <button
        v-if="tipo === 'senha'"
        type="button"
        class="campo-olho"

        :aria-label="senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'"
        :aria-pressed="senhaVisivel"
        @click="senhaVisivel = !senhaVisivel"
      >
        <!-- Olho do Figma (contorno + pupila) num único SVG; com a senha visível ganha o risco. -->
        <svg
          class="campo-olho-icone"
          viewBox="0 0 21.25 15.45"
          width="21"
          height="15"
          aria-hidden="true"
        >
          <path d="M1.03 8.06a1 1 0 0 1 0-.67 10.4 10.4 0 0 1 19.19 0 1 1 0 0 1 0 .67 10.4 10.4 0 0 1-19.19 0Z" />
          <circle
            cx="10.62"
            cy="7.72"
            r="2.9"
          />
          <line
            v-if="senhaVisivel"
            x1="2"
            y1="14"
            x2="19.25"
            y2="1.45"
          />
        </svg>
      </button>
    </div>

    <p
      v-if="erro"
      :id="idErro"
      class="campo-erro"
      role="alert"
    >
      {{ erro }}
    </p>
    <!-- Região sempre presente para o leitor de tela anunciar o aviso quando ele aparece. -->
    <p
      :id="idLimite"
      class="campo-limite"
      aria-live="polite"
    >
      <template v-if="limiteAtingido">Limite de {{ maxlength }} caracteres atingido.</template>
    </p>
  </div>
</template>

<style scoped>
.campo {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.campo-rotulo {
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
}

/* Rótulo sempre em uma linha: texto longo vira "…" e o * nunca vai para a linha de baixo,
   mantendo os inputs da mesma linha da grade alinhados. */
.campo-rotulo {
  display: flex;
  align-items: baseline;
  gap: 3px;
  min-width: 0;
  white-space: nowrap;
}

.campo-rotulo-texto {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.campo-obrigatorio {
  flex-shrink: 0;
  color: var(--fp-obrigatorio);
}

.campo-dica {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 2px;
  color: #717182;
  font-size: 12.7px;
  font-weight: 400;
}

.campo-controle {
  position: relative;
}

.campo-input {
  width: 100%;
  /* Formulários mais densos (ex.: cadastro de funcionário) reduzem a altura via --campo-altura. */
  height: var(--campo-altura, 42px);

  padding: 0 14px;
  border: 1.2px solid var(--fp-verde-30);
  border-radius: 9px;
  background-color: #fff;

  color: #222;
  font-family: inherit;
  font-size: 16px;
}

.campo-input::placeholder {
  color: #717182;
}

.campo-input:focus {
  outline: none;
  border-color: var(--fp-verde);
  box-shadow: var(--fp-foco);
}

/* Somente leitura / desabilitado: fundo cinza translúcido. */
input.campo-input:read-only,
.campo-input:disabled {
  background-color: rgba(229, 231, 235, 0.3);
  color: #6b7280;
}

.campo-input:disabled {
  cursor: not-allowed;
}

.campo-input--invalido {
  border-color: var(--fp-vermelho);
}

.campo-input--invalido:focus {
  border-color: var(--fp-vermelho);
  box-shadow: 0 0 0 3px rgba(231, 0, 11, 0.2);
}

.campo-select {
  padding-right: 40px;
  appearance: none;
  text-overflow: ellipsis;
  cursor: pointer;
}

.campo-input--vazio {
  color: #717182;
}

.campo-seta {
  position: absolute;
  right: 13px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.campo-input--senha,
.campo-input--com-fim {
  padding-right: 48px;
}

.campo-fim {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
}

.campo-area {
  height: auto;
  padding: 10px 14px;
  line-height: 1.4;
  resize: vertical;
}

.campo-olho {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);

  width: 34px;
  height: 34px;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;

  cursor: pointer;
}

.campo-olho:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.campo-olho-icone {
  display: block;
  overflow: visible;
  fill: none;
  stroke: var(--fp-verde);
  stroke-width: 1.93;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.campo-limite {
  margin: 0;
  color: #717182;
  font-size: 12.5px;
}

/* Sem aviso, a região (live) continua no DOM mas não ocupa espaço, nem o gap do campo. */
.campo-limite:empty {
  height: 0;
  margin-top: -6px;
}

.campo-erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 12.5px;
}
</style>
