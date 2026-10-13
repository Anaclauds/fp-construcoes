<script setup lang="ts">
export type VarianteBotao = 'primario' | 'secundario' | 'neutro' | 'perigo' | 'perigo-suave' | 'link'
export type TamanhoBotao = 'pagina' | 'modal' | 'formulario'

withDefaults(
  defineProps<{
    variante?: VarianteBotao
    /** pagina: ação do cabeçalho (13px); modal: rodapé de modal; formulario: rodapé de página de formulário. */
    tamanho?: TamanhoBotao
    type?: 'button' | 'submit' | 'reset'
    carregando?: boolean
    desabilitado?: boolean
  }>(),
  { variante: 'primario', tamanho: 'modal', type: 'button', carregando: false, desabilitado: false },
)
</script>

<template>
  <!-- Demais atributos (form, aria-*, @click) caem direto no <button>. -->
  <button
    :type="type"
    class="botao-fp"
    :class="[`botao-fp--${variante}`, `botao-fp--${tamanho}`]"
    :disabled="desabilitado || carregando"
    :aria-busy="carregando || undefined"
  >
    <slot name="icone" />
    <span class="botao-fp-texto"><slot /></span>
  </button>
</template>

<style scoped>
.botao-fp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  border: 1.5px solid transparent;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    filter 0.15s ease;
}

.botao-fp:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.botao-fp:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tamanhos */
.botao-fp--pagina {
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.botao-fp--modal {
  min-height: 46px;
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
}

.botao-fp--formulario {
  min-height: 49px;
  padding: 10px 28px;
  border-radius: 9px;
  font-size: 15px;
  font-weight: 700;
}

/* Variantes */
.botao-fp--primario {
  background-color: var(--fp-verde);
  border-color: var(--fp-verde);
  color: #fff;
}

.botao-fp--primario:hover:not(:disabled) {
  filter: brightness(1.12);
}

.botao-fp--secundario {
  background-color: #fff;
  border-color: #d1d5dc;
  color: #666;
}

.botao-fp--secundario:hover:not(:disabled) {
  background-color: var(--fp-cinza-fundo);
}

.botao-fp--neutro {
  background-color: var(--fp-cinza-borda);
  border-color: #d1d5dc;
  color: var(--fp-texto-corpo);
}

.botao-fp--neutro:hover:not(:disabled) {
  filter: brightness(0.96);
}

.botao-fp--perigo {
  background-color: var(--fp-vermelho);
  border-color: var(--fp-vermelho);
  color: #fff;
}

.botao-fp--perigo:hover:not(:disabled) {
  filter: brightness(1.08);
}

/* "Confirmar Desativação": contorno vermelho claro; no hover vira sólido. */
.botao-fp--perigo-suave {
  background-color: #fff;
  border-color: #ff8a90;
  color: var(--fp-vermelho);
}

.botao-fp--perigo-suave:hover:not(:disabled),
.botao-fp--perigo-suave:focus-visible {
  background-color: var(--fp-vermelho);
  border-color: var(--fp-vermelho);
  color: #fff;
}

.botao-fp--link {
  padding-left: 0;
  padding-right: 0;
  background: none;
  border-color: transparent;
  color: var(--fp-verde);
}

.botao-fp--link:hover:not(:disabled) {
  text-decoration: underline;
}
</style>
