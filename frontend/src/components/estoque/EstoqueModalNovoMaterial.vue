<script setup lang="ts">
import { nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioNovoMaterialEstoque } from '../../composables/useFormularioNovoMaterialEstoque'
import { criarMaterialNoEstoque } from '../../services/estoque.service'
import { mascararQuantidade, normalizarQuantidade } from '../../utils/estoque'
import { focarPrimeiroErro } from '../../utils/foco'
import { LIMITE_NOME_MATERIAL } from '../../utils/materiais'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'

const emit = defineEmits<{
  fechar: []
  /** Material criado com o saldo inicial; quem usa mostra o toast e recarrega a lista. */
  criado: []
}>()

const form = useFormularioNovoMaterialEstoque()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

/** X, Esc, clique fora e Cancelar: com algo preenchido pergunta antes de descartar. */
function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function salvar() {
  if (!form.validar()) {
    await nextTick()
    focarPrimeiroErro(raiz.value)
    return
  }

  salvando.value = true
  try {
    await criarMaterialNoEstoque(form.paraPayload())
    emit('criado')
  } catch (e) {
    form.tratarErroApi(e)
    await nextTick()
    focarPrimeiroErro(raiz.value)
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Adicionar Novo Material no Estoque"
    icone="mais"
    largura="580px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <CampoFormulario
        v-model="form.campos.nome"
        rotulo="Nome do Material:"
        obrigatorio
        placeholder="Ex: Tubo 40x40, Chapa 2mm..."
        autocomplete="off"
        :maxlength="LIMITE_NOME_MATERIAL"
        :erro="form.erros.nome"
      />
      <div class="linha">
        <CampoFormulario
          v-model="form.campos.categoria"
          rotulo="Categoria:"
          tipo="select"
          obrigatorio
          placeholder="Selecione"
          :opcoes="form.opcoes.categoria"
          :erro="form.erros.categoria"
        />
        <CampoFormulario
          v-model="form.campos.unidade"
          rotulo="Unidade de Medida:"
          tipo="select"
          obrigatorio
          placeholder="Selecione"
          :opcoes="form.opcoes.unidade"
          :erro="form.erros.unidade"
        />
      </div>
      <CampoFormulario
        v-model="form.campos.quantidade"
        :rotulo="form.rotuloQuantidade.value"
        obrigatorio
        placeholder="Ex: 100"
        inputmode="decimal"
        autocomplete="off"
        :mascara="mascararQuantidade"
        :normalizar="normalizarQuantidade"
        aviso="Quantidade disponível ao cadastrar. Pode ser ajustada depois."
        :erro="form.erros.quantidade"
      />
      <p class="nota">
        * O preço de referência e o fornecedor podem ser informados depois, em Material.
      </p>

      <p
        v-if="form.erroGeral.value"
        class="erro-geral"
        role="alert"
      >
        {{ form.erroGeral.value }}
      </p>
    </form>

    <template #rodape>
      <BotaoFp
        variante="secundario"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
      >
        Cadastrar Material
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    mensagem="Os dados preenchidos para este material serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.formulario {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 14px;
}

.linha {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.nota {
  margin: 0;
  color: #717182;
  font-size: 12.5px;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

@media (max-width: 520px) {
  .linha {
    grid-template-columns: 1fr;
  }
}
</style>
