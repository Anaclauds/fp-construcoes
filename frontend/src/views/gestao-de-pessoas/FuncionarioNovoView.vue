<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import FuncionarioFormulario from '../../components/funcionarios/FuncionarioFormulario.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import ModalDescartar from '../../components/ui/ModalDescartar.vue'
import { useAvisoAlteracoes } from '../../composables/useAvisoAlteracoes'
import { useFormularioFuncionario } from '../../composables/useFormularioFuncionario'
import { useToast } from '../../composables/useToast'
import { criarFuncionario } from '../../services/funcionarios.service'

const router = useRouter()
const { mostrarToast } = useToast()

const formulario = useTemplateRef('formulario')
const form = useFormularioFuncionario()
const salvando = shallowRef(false)
const salvo = shallowRef(false)

// Qualquer campo preenchido conta como cadastro em andamento (depois de salvar, não).
const preenchido = computed(
  () => !salvo.value && Object.values(form.campos).some((valor) => valor.trim() !== ''),
)
const aviso = useAvisoAlteracoes(preenchido)

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await formulario.value?.focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await criarFuncionario(form.paraPayload())
    salvo.value = true
    mostrarToast('Funcionário cadastrado!')
    await router.push({ name: 'funcionarios' })
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
        titulo="Cadastrar Funcionário"
        subtitulo="Preencha os dados do novo funcionário"
      />
      <LinkVoltar :para="{ name: 'funcionarios' }" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <FuncionarioFormulario
        ref="formulario"
        :form="form"
      />

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="router.push({ name: 'funcionarios' })"
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
  gap: 14px;
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.rodape {
  display: flex;
  justify-content: space-between;
  padding-bottom: 20px;
}
</style>
