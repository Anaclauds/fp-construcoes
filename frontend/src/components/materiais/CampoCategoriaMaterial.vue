<script setup lang="ts">
import { shallowRef } from 'vue'
import type { CatalogoMaterial } from '../../composables/useCatalogoMaterial'
import { extrairErro, errosPorCampo } from '../../services/api'
import { limparEspacos } from '../../utils/formatadores'
import { LIMITE_CATEGORIA_MATERIAL } from '../../utils/materiais'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario, { type OpcaoCampo } from '../ui/CampoFormulario.vue'

const props = defineProps<{
  opcoes: OpcaoCampo[]
  catalogo: CatalogoMaterial
  erro?: string
  placeholder?: string
}>()

/** Valor da categoria selecionada (o `nome` do catálogo, que é o que a API recebe). */
const categoria = defineModel<string>({ default: '' })

const cadastrando = shallowRef(false)
const nome = shallowRef('')
const erroNome = shallowRef<string | undefined>()
const salvando = shallowRef(false)

function abrir() {
  nome.value = ''
  erroNome.value = undefined
  cadastrando.value = true
}

async function cadastrar() {
  const texto = limparEspacos(nome.value)
  if (texto === '') {
    erroNome.value = 'Informe o nome da categoria.'
    return
  }
  salvando.value = true
  erroNome.value = undefined
  try {
    categoria.value = await props.catalogo.cadastrarCategoria(texto)
    cadastrando.value = false
  } catch (e) {
    erroNome.value = errosPorCampo(e).nome ?? extrairErro(e).mensagem
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div class="campo-categoria">
    <CampoFormulario
      v-model="categoria"
      rotulo="Categoria:"
      tipo="select"
      obrigatorio
      :placeholder="placeholder ?? 'Selecione'"
      :opcoes="opcoes"
      :erro="erro"
      :aviso="catalogo.indisponivel.value ? 'Lista de categorias indisponível no momento.' : undefined"
    />
    <template v-if="catalogo.podeCadastrarCategoria.value">
      <button
        v-if="!cadastrando"
        type="button"
        class="link-nova"
        @click="abrir"
      >
        + Nova categoria
      </button>
      <div
        v-else
        class="nova"
        @keydown.enter.prevent="cadastrar"
      >
        <CampoFormulario
          v-model="nome"
          rotulo="Nova categoria:"
          placeholder="Ex: Hidráulica"
          autocomplete="off"
          :maxlength="LIMITE_CATEGORIA_MATERIAL"
          :erro="erroNome"
        />
        <div class="acoes">
          <BotaoFp
            variante="secundario"
            tamanho="compacto"
            :desabilitado="salvando"
            @click="cadastrando = false"
          >
            Cancelar
          </BotaoFp>
          <BotaoFp
            tamanho="compacto"
            :carregando="salvando"
            @click="cadastrar"
          >
            Adicionar
          </BotaoFp>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.campo-categoria {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.link-nova {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.link-nova:hover {
  text-decoration: underline;
}

.nova {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
