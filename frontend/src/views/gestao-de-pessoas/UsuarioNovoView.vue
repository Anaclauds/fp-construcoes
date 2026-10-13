<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AcessosPermitidos from '../../components/ui/AcessosPermitidos.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CampoFormulario from '../../components/ui/CampoFormulario.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import { useFuncionariosSemUsuario } from '../../composables/useFuncionariosSemUsuario'
import { useToast } from '../../composables/useToast'
import { extrairErro } from '../../services/api'
import { criarUsuario } from '../../services/usuarios.service'
import { formatarCpf } from '../../utils/formatadores'
import { permissoesParaPayload, type MapaPermissoes } from '../../utils/permissoes'
import { validarSenhas } from '../../utils/validacao'

const router = useRouter()
const { mostrarToast } = useToast()
const { funcionarios, carregando: carregandoFuncionarios, erro: erroFuncionarios, carregar } =
  useFuncionariosSemUsuario()

const funcionarioId = shallowRef('')
const senha = shallowRef('')
const confirmarSenha = shallowRef('')
const permissoes = shallowRef<MapaPermissoes>({})

const erros = reactive<{ funcionario?: string; senha?: string; confirmarSenha?: string }>({})
const erroApi = shallowRef<string | null>(null)
const salvando = shallowRef(false)

const opcoesFuncionario = computed(() =>
  funcionarios.value.map((f) => ({ valor: String(f.id), rotulo: f.nomeCompleto })),
)
const selecionado = computed(() => funcionarios.value.find((f) => String(f.id) === funcionarioId.value))

const placeholderFuncionario = computed(() => {
  if (carregandoFuncionarios.value) return 'Carregando funcionários...'
  if (opcoesFuncionario.value.length === 0) return 'Nenhum funcionário disponível'
  return 'Selecione o funcionário'
})

function validar(): boolean {
  erros.funcionario = selecionado.value ? undefined : 'Selecione um funcionário.'
  const senhas = validarSenhas(senha.value, confirmarSenha.value, true)
  erros.senha = senhas.senha
  erros.confirmarSenha = senhas.confirmarSenha
  return !erros.funcionario && !erros.senha && !erros.confirmarSenha
}

async function salvar() {
  erroApi.value = null
  if (!validar() || !selecionado.value) return

  salvando.value = true
  try {
    await criarUsuario({
      funcionarioId: selecionado.value.id,
      senha: senha.value,
      confirmarSenha: confirmarSenha.value,
      permissoes: permissoesParaPayload(permissoes.value),
    })
    mostrarToast('Salvo com sucesso!')
    await router.push({ name: 'usuarios' })
  } catch (e) {
    const { mensagem, status } = extrairErro(e)
    erroApi.value = mensagem
    // 409/404: a lista de candidatos ficou desatualizada.
    if (status === 409 || status === 404) {
      funcionarioId.value = ''
      await carregar()
    }
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <div class="topo">
      <CabecalhoPagina
        titulo="Cadastrar Usuário"
        subtitulo="Preencha os dados e configure as permissões de acesso"
      />
      <LinkVoltar :para="{ name: 'usuarios' }" />
    </div>

    <form
      class="formulario"
      novalidate
      @submit.prevent="salvar"
    >
      <h2 class="secao">
        Informações do Usuário
      </h2>

      <div class="grade">
        <CampoFormulario
          v-model="funcionarioId"
          rotulo="Funcionário"
          tipo="select"
          obrigatorio
          :placeholder="placeholderFuncionario"
          :opcoes="opcoesFuncionario"
          :desabilitado="carregandoFuncionarios"
          :erro="erros.funcionario ?? erroFuncionarios ?? undefined"
        />
        <CampoFormulario
          rotulo="Função:"
          somente-leitura
          placeholder="Selecione um funcionário"
          :model-value="selecionado?.funcao ?? ''"
        />
        <CampoFormulario
          rotulo="Status:"
          somente-leitura
          placeholder="Selecione um funcionário"
          :model-value="selecionado ? 'Ativo' : ''"
        />

        <CampoFormulario
          rotulo="Login:"
          dica="(CPF do funcionário)"
          somente-leitura
          placeholder="Selecione um funcionário"
          :model-value="selecionado ? formatarCpf(selecionado.cpf) : ''"
        />
        <CampoFormulario
          v-model="senha"
          rotulo="Senha inicial:"
          tipo="senha"
          obrigatorio
          placeholder="Digite a senha inicial"
          autocomplete="new-password"
          :erro="erros.senha"
        />
        <CampoFormulario
          v-model="confirmarSenha"
          rotulo="Confirme a senha:"
          tipo="senha"
          obrigatorio
          placeholder="Digite a senha inicial"
          autocomplete="new-password"
          :erro="erros.confirmarSenha"
        />
      </div>

      <AcessosPermitidos v-model="permissoes" />

      <p
        v-if="erroApi"
        class="erro-api"
        role="alert"
      >
        {{ erroApi }}
      </p>

      <div class="rodape">
        <BotaoFp
          variante="secundario"
          tamanho="formulario"
          :desabilitado="salvando"
          @click="router.push({ name: 'usuarios' })"
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
  gap: 12px;
}

.secao {
  margin: 0;
  color: var(--fp-verde);
  font-size: 22px;
  font-weight: 500;
}

.grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px 25px;
}

.erro-api {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.rodape {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

@media (max-width: 1100px) {
  .grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .grade {
    grid-template-columns: 1fr;
  }
}
</style>
