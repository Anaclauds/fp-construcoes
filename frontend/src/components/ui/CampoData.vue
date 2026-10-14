<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { isoValido } from '../../utils/datas'
import { dataBrParaIso, isoParaDataBr, mascararData } from '../../utils/formatadores'
import { dataBrValida } from '../../utils/validacao'
import CampoFormulario from './CampoFormulario.vue'

const props = defineProps<{
  rotulo: string
  obrigatorio?: boolean
  erro?: string
  /** Aviso neutro abaixo do campo (ex.: "Sugestão: 03/01/2026"). */
  aviso?: string
  /** Ano mínimo aceito pelo calendário (a validação do formulário usa o mesmo valor); sem ele, qualquer data. */
  anoMinimo?: number
}>()

// Texto no formato DD/MM/AAAA (pode estar incompleto durante a digitação).
const valor = defineModel<string>({ default: '' })

/**
 * Colar uma data ISO ("2026-10-20", com ou sem hora) vira DD/MM/AAAA; o resto segue a máscara normal.
 * Sem isso os dígitos da ISO entrariam na máscara na ordem errada ("20/26/1020").
 */
function mascarar(texto: string): string {
  const iso = /^\s*(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(texto)
  return mascararData(iso ? `${iso[3]}${iso[2]}${iso[1]}` : texto)
}

const campoNativo = useTemplateRef<HTMLInputElement>('campoNativo')

function abrirCalendario() {
  const campo = campoNativo.value
  if (!campo) return
  campo.value = dataBrValida(valor.value) ? dataBrParaIso(valor.value) : ''
  if (typeof campo.showPicker === 'function') campo.showPicker()
  else campo.focus()
}

function aoEscolher(evento: Event) {
  const iso = (evento.target as HTMLInputElement).value
  if (isoValido(iso)) valor.value = isoParaDataBr(iso)
}
</script>

<template>
  <CampoFormulario
    v-model="valor"
    :rotulo="rotulo"
    :obrigatorio="obrigatorio"
    :erro="erro"
    :aviso="aviso"
    placeholder="DD/MM/AAAA"
    :mascara="mascarar"
    inputmode="numeric"
    :maxlength="10"
    autocomplete="off"
  >
    <template #fim>
      <button
        type="button"
        class="campo-data-calendario"
        :aria-label="`Abrir calendário (${rotulo.replace(/[:*]/g, '').trim()})`"
        @click="abrirCalendario"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="5"
            width="17"
            height="15.5"
            rx="2.5"
          />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>
      <input
        ref="campoNativo"
        type="date"
        class="campo-data-nativo"
        tabindex="-1"
        aria-hidden="true"
        :min="props.anoMinimo ? `${props.anoMinimo}-01-01` : undefined"
        @change="aoEscolher"
      >
    </template>
  </CampoFormulario>
</template>

<style scoped>
.campo-data-calendario {
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

.campo-data-calendario svg {
  fill: none;
  stroke: var(--fp-verde);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.campo-data-calendario:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.campo-data-nativo {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
