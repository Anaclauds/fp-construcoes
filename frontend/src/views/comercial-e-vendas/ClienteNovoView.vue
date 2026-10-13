<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import ClienteFormulario from '../../components/clientes/ClienteFormulario.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import ModalDescartar from '../../components/ui/ModalDescartar.vue'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import { useFormularioCliente } from '../../composables/useFormularioCliente'
import { useToast } from '../../composables/useToast'
import { criarCliente } from '../../services/clientes.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioCliente()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

// Qualquer campo preenchido conta como cadastro em andamento (depois de salvar, não).
const preenchido = computed(() => !salvo.value && form.alterado.value)
const aviso = useAvisoAlteracoes(preenchido)

async function salvar() {
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarCliente(form.paraPayload())
    salvo.value = true
    mostrarToast('Salvo com sucesso!')
    await router.push({ name: 'clientes' })
  } catch (erro) {
    form.tratarErroApi(erro)
    await formulario.value?.focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <section class="pagina">
    <div class="topo">
      <CabecalhoPagina
        titulo="Cadastrar Cliente"
        subtitulo="Preencha os dados do novo cliente"
      />
      <LinkVoltar :para="{ name: 'clientes' }" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <ClienteFormulario
        ref="formulario"
        :form="form"
      />

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="router.push({ name: 'clientes' })"
        >
          Cancelar
        </BotaoFp>
        <BotaoFp
          type="submit"
          tamanho="formulario"
          :carregando="salvando"
        >
          Salvar
        </BotaoFp>
      </div>
    </form>

    <ModalDescartar
      :aberto="aviso.aberto.value"
      @confirmar="aviso.responder(true)"
      @fechar="aviso.responder(false)"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.topo {
  display: flex;
  flex-direction: column;
  /* Figma: "Voltar" a ~28px do subtítulo e a alternância PF | PJ a ~49px do "Voltar". */
  gap: 28px;
}

.formulario {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 34px;
}

/* Figma: Cancelar e Salvar ficam na base da página (o formulário de cliente é curto). */
.rodape {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  /* O conteúdo da página já reserva 36px abaixo; o Figma deixa os botões a 23px da borda. */
  margin-bottom: -13px;
}
</style>
