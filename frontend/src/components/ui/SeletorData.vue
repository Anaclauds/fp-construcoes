<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import anteriorIcon from '../../assets/icons/icone-pagina-anterior.svg'
import proximaIcon from '../../assets/icons/icone-pagina-proxima.svg'
import selectIcon from '../../assets/icons/icone-select.svg'
import { adicionarDias, diaDaSemana, hojeIso, isoValido } from '../../utils/datas'
import { isoParaDataBr } from '../../utils/formatadores'

// Data escolhida (YYYY-MM-DD).
const data = defineModel<string>({ required: true })

const campoNativo = useTemplateRef<HTMLInputElement>('campoNativo')

const ehHoje = computed(() => data.value === hojeIso())

function irPara(iso: string) {
  if (isoValido(iso)) data.value = iso
}

/** Abre o calendário do navegador; o input nativo fica invisível só para isso. */
function abrirCalendario() {
  const campo = campoNativo.value
  if (!campo) return
  if (typeof campo.showPicker === 'function') campo.showPicker()
  else campo.focus()
}

function aoEscolher(evento: Event) {
  irPara((evento.target as HTMLInputElement).value)
}
</script>

<template>
  <div
    class="seletor-data"
    role="group"
    aria-label="Data da frequência"
  >
    <button
      type="button"
      class="seletor-data-seta"
      aria-label="Dia anterior"
      @click="irPara(adicionarDias(data, -1))"
    >
      <img
        :src="anteriorIcon"
        alt=""
        width="7"
        height="12"
      >
    </button>

    <div class="seletor-data-centro">
      <button
        type="button"
        class="seletor-data-valor"
        aria-label="Escolher data"
        @click="abrirCalendario"
      >
        <span class="seletor-data-texto">
          <span class="seletor-data-dia">{{ isoParaDataBr(data) }}</span>
          <span class="seletor-data-semana">{{ diaDaSemana(data) }}</span>
        </span>
        <img
          :src="selectIcon"
          alt=""
          width="18"
          height="18"
        >
      </button>
      <input
        ref="campoNativo"
        type="date"
        class="seletor-data-nativo"
        :value="data"
        tabindex="-1"
        aria-hidden="true"
        @change="aoEscolher"
      >
    </div>

    <button
      type="button"
      class="seletor-data-seta"
      aria-label="Próximo dia"
      @click="irPara(adicionarDias(data, 1))"
    >
      <img
        :src="proximaIcon"
        alt=""
        width="7"
        height="12"
      >
    </button>

    <button
      type="button"
      class="seletor-data-hoje"
      :disabled="ehHoje"
      @click="irPara(hojeIso())"
    >
      Hoje
    </button>
  </div>
</template>

<style scoped>
.seletor-data {
  display: flex;
  align-items: center;
  gap: 10px;
}

.seletor-data-seta {
  width: 34px;
  height: 34px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  padding: 0;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 10px;
  background-color: #fff;
  cursor: pointer;
}

.seletor-data-seta:hover {
  background-color: var(--fp-cinza-fundo);
}

.seletor-data-centro {
  position: relative;
}

.seletor-data-valor {
  min-width: 190px;
  height: 46px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  padding: 0 14px 0 17px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: 10px;
  background-color: #fff;

  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.seletor-data-valor:hover {
  border-color: var(--fp-verde);
}

.seletor-data-texto {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.seletor-data-dia {
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 600;
}

.seletor-data-semana {
  color: #666;
  font-size: 12px;
}

/* Existe só para abrir o calendário nativo perto do botão. */
.seletor-data-nativo {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  pointer-events: none;
}

.seletor-data-hoje {
  height: 36px;
  padding: 0 16px;
  border: 1px solid var(--fp-verde);
  border-radius: 10px;
  background-color: var(--fp-verde);

  color: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.seletor-data-hoje:disabled {
  border-color: var(--fp-cinza-borda);
  background-color: #fff;
  color: var(--fp-cinza-rotulo);
  cursor: default;
}

.seletor-data-seta:focus-visible,
.seletor-data-valor:focus-visible,
.seletor-data-hoje:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

@media (max-width: 700px) {
  .seletor-data-valor {
    min-width: 0;
  }
}
</style>
