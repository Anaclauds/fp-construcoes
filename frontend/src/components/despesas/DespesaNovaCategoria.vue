<script setup lang="ts">
import { shallowRef } from 'vue'
import { useCategoriasDespesa } from '../../composables/useCategoriasDespesa'
import { limparEspacos } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const emit = defineEmits<{
  /** Nome (valor enviado à API) da categoria cadastrada, já recarregada no catálogo. */
  criada: [nome: string]
}>()

const LIMITE_NOME = 100

const { cadastrar } = useCategoriasDespesa()

const aberto = shallowRef(false)
const nome = shallowRef('')
const erro = shallowRef<string | undefined>()
const salvando = shallowRef(false)

function abrir() {
  aberto.value = true
  erro.value = undefined
}

function cancelar() {
  aberto.value = false
  nome.value = ''
  erro.value = undefined
}

async function salvar() {
  if (salvando.value) return
  const texto = limparEspacos(nome.value)
  if (texto === '') {
    erro.value = 'Informe o nome da categoria.'
    return
  }
  salvando.value = true
  erro.value = undefined
  const resultado = await cadastrar(texto)
  salvando.value = false
  if ('categoria' in resultado) {
    emit('criada', resultado.categoria.nome)
    cancelar()
  } else {
    erro.value = resultado.erro
  }
}
</script>

<template>
  <div class="nova-categoria">
    <button
      v-if="!aberto"
      type="button"
      class="nova-categoria-link"
      @click="abrir"
    >
      + Cadastrar nova categoria
    </button>

    <div
      v-else
      class="nova-categoria-form"
    >
      <CampoFormulario
        v-model="nome"
        rotulo="Nova categoria:"
        placeholder="Ex.: Frete especial"
        autocomplete="off"
        :maxlength="LIMITE_NOME"
        :erro="erro"
        @update:model-value="erro = undefined"
        @keydown.enter.prevent="salvar"
      />
      <div class="nova-categoria-acoes">
        <BotaoFp
          variante="secundario"
          tamanho="compacto"
          :desabilitado="salvando"
          @click="cancelar"
        >
          Cancelar
        </BotaoFp>
        <BotaoFp
          tamanho="compacto"
          :carregando="salvando"
          @click="salvar"
        >
          Cadastrar
        </BotaoFp>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nova-categoria {
  grid-column: 1 / -1;
}

.nova-categoria-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.nova-categoria-link:focus-visible {
  outline: none;
  border-radius: 4px;
  box-shadow: var(--fp-foco);
}

.nova-categoria-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--fp-verde-20);
  border-radius: var(--fp-raio);
}

.nova-categoria-acoes {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
