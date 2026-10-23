<script setup lang="ts">
import { nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ClienteCamposRapidos from './ClienteCamposRapidos.vue'
import { useFormularioCliente } from '../../composables/useFormularioCliente'
import { useToast } from '../../composables/useToast'
import { criarCliente } from '../../services/clientes.service'
import type { Cliente } from '../../types'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'

/**
 * Cadastro rápido de cliente (nome, telefone, estado e cidade), pensado para ser aberto a partir de
 * outras telas, como "+ Novo Cliente" no orçamento. Monte com `v-if`: o componente mostra o toast de
 * sucesso e emite `salvo` com o cliente criado (sem tipo, `cadastroCompleto: false`), para quem abriu
 * selecioná-lo e desmontar o modal. `fechar` = desistiu (X, Esc, clique fora ou Cancelar).
 */
const emit = defineEmits<{
  fechar: []
  salvo: [cliente: Cliente]
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
// Sem tipo: só nome, telefone, estado e cidade.
const form = useFormularioCliente(null, '')
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)
const { mostrarToast } = useToast()

function pedirFechar() {
  if (form.alterado.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErro() {
  await nextTick()
  focarPrimeiroErroEm(raiz.value)
}

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    const cliente = await criarCliente(form.paraPayload())
    mostrarToast('Cliente cadastrado!')
    emit('salvo', cliente)
  } catch (erro) {
    form.tratarErroApi(erro)
    await focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Cadastro Rápido de Cliente"
    icone="mais"
    largura="450px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      novalidate
      @submit.prevent="salvar"
    >
      <ClienteCamposRapidos :form="form" />
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
        Salvar
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar cadastro?"
    mensagem="Os dados preenchidos serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.erro-geral {
  margin: 14px 0 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
