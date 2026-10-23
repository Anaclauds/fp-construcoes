<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import ServicoFormulario from '../../components/servicos/ServicoFormulario.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import ModalDescartar from '../../components/ui/ModalDescartar.vue'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import { useFormularioServico } from '../../composables/useFormularioServico'
import { useToast } from '../../composables/useToast'
import { criarServico } from '../../services/servicos.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioServico()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

// Qualquer campo preenchido conta como cadastro em andamento (depois de salvar, não).
const preenchido = computed(() => !salvo.value && form.alterado.value)
const aviso = useAvisoAlteracoes(preenchido)

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarServico(form.paraPayload())
    salvo.value = true
    mostrarToast('Serviço cadastrado!')
    await router.push({ name: 'servicos' })
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
        titulo="Cadastrar Serviço"
        subtitulo="Preencha os dados abaixo para cadastrar um novo serviço"
      />
      <LinkVoltar :para="{ name: 'servicos' }" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <ServicoFormulario
        ref="formulario"
        :form="form"
      />

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="router.push({ name: 'servicos' })"
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
  /* Figma: "Voltar" a ~28px do subtítulo. */
  gap: 28px;
}

.formulario {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 2px;
}

/* Figma: Cancelar e Salvar ficam na base da página. */
.rodape {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  margin-bottom: -13px;
}
</style>
