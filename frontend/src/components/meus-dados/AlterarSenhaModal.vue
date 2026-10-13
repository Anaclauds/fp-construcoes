<script setup lang="ts">
import { computed, nextTick, reactive, shallowRef, useId, useTemplateRef, watch } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import { useToast } from '../../composables/useToast'
import { extrairErro } from '../../services/api'
import { alterarSenha } from '../../services/auth.service'
import { validarAlterarSenha, type ErrosAlterarSenha } from '../../utils/validacao'

const emit = defineEmits<{
  fechar: []
  /** Senha alterada com sucesso. */
  salvo: []
}>()

const { mostrarToast } = useToast()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')

const campos = reactive({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' })
const erros = reactive<ErrosAlterarSenha>({})
const erroGeral = shallowRef<string | null>(null)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

const preenchido = computed(() => Object.values(campos).some((valor) => valor !== ''))

// Mexeu no campo: o erro daquele campo some até a próxima validação.
for (const chave of Object.keys(campos) as (keyof typeof campos)[]) {
  watch(
    () => campos[chave],
    () => {
      if (erros[chave]) erros[chave] = undefined
      erroGeral.value = null
    },
  )
}

/** X, Esc, clique fora e Cancelar: com campos preenchidos pergunta antes de descartar. */
function pedirFechar() {
  if (preenchido.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErro() {
  await nextTick()
  raiz.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function salvar() {
  erroGeral.value = null
  const resultado = validarAlterarSenha(campos.senhaAtual, campos.novaSenha, campos.confirmarNovaSenha)
  erros.senhaAtual = resultado.senhaAtual
  erros.novaSenha = resultado.novaSenha
  erros.confirmarNovaSenha = resultado.confirmarNovaSenha
  if (Object.keys(resultado).length > 0) {
    await focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    await alterarSenha({ ...campos })
    mostrarToast('Senha alterada com sucesso!')
    emit('salvo')
  } catch (erro) {
    const { mensagem, status } = extrairErro(erro)
    // 401 desta rota = senha atual errada (o interceptor não desloga aqui).
    if (status === 401) erros.senhaAtual = 'Senha atual incorreta.'
    else erroGeral.value = mensagem
    await focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Alterar Senha"
    icone="cadeado"
    largura="450px"
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
        v-model="campos.senhaAtual"
        rotulo="Senha atual"
        tipo="senha"
        placeholder="Digite sua senha atual"
        autocomplete="current-password"
        :erro="erros.senhaAtual"
        obrigatorio
      />
      <CampoFormulario
        v-model="campos.novaSenha"
        rotulo="Nova senha"
        tipo="senha"
        placeholder="Digite sua nova senha"
        autocomplete="new-password"
        :erro="erros.novaSenha"
        obrigatorio
      />
      <CampoFormulario
        v-model="campos.confirmarNovaSenha"
        rotulo="Confirmar nova senha"
        tipo="senha"
        placeholder="Confirme sua nova senha"
        autocomplete="new-password"
        :erro="erros.confirmarNovaSenha"
        obrigatorio
      />

      <p
        v-if="erroGeral"
        class="erro-geral"
        role="alert"
      >
        {{ erroGeral }}
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
    titulo="Descartar alterações?"
    mensagem="A senha não será alterada."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.formulario {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}
</style>
