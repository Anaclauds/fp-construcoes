<script setup lang="ts">
import { computed, onMounted, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioEdicaoProjeto } from '../../composables/useFormularioEdicaoProjeto'
import { useResponsaveisOrcamento } from '../../composables/useResponsaveisOrcamento'
import { editarProjeto } from '../../services/projetos.service'
import type { ProjetoDetalhe, ProjetoResumo } from '../../types/projeto'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'
import { mascararCep, rotuloLegivel } from '../../utils/formatadores'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import { UFS, montarOpcoes } from '../../utils/opcoes-cliente'
import { ANO_MINIMO_DATA_PROJETO } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'

const props = defineProps<{ projeto: ProjetoResumo }>()

const emit = defineEmits<{
  fechar: []
  /** Leva o projeto atualizado (formato do detalhe). */
  salvo: [projeto: ProjetoDetalhe]
  /** O backend indicou que o projeto mudou (concluído, cancelado...): a lista precisa recarregar. */
  desatualizado: []
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const form = useFormularioEdicaoProjeto(props.projeto)
const funcionarios = useResponsaveisOrcamento()
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

onMounted(() => void funcionarios.carregar())

const opcoesResponsavel = computed(() => {
  const opcoes = funcionarios.funcionarios.value
    .filter((f) => f.status === 'ATIVO')
    .map((f) => ({ valor: String(f.id), rotulo: f.funcao ? `${f.nomeCompleto} — ${rotuloLegivel(f.funcao)}` : f.nomeCompleto }))
  // O responsável atual continua na lista mesmo que a consulta falhe (ou que ele tenha sido desativado).
  const atual = props.projeto.responsavel
  if (!opcoes.some((o) => o.valor === String(atual.id))) {
    opcoes.unshift({ valor: String(atual.id), rotulo: atual.funcao ? `${atual.nomeCompleto} — ${rotuloLegivel(atual.funcao)}` : atual.nomeCompleto })
  }
  return opcoes
})

const avisoResponsavel = computed(() => {
  if (funcionarios.semPermissao.value) {
    return 'Seu perfil não pode listar funcionários: só é possível manter o responsável atual.'
  }
  return funcionarios.erro.value ?? undefined
})

const opcoesEstado = montarOpcoes(UFS)
const identificacao = computed(() => `${formatarNumeroOrcamento(props.projeto.orcamento.numero)} · ${props.projeto.orcamento.titulo}`)

function pedirFechar() {
  if (form.alterado.value && !salvando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErro() {
  await Promise.resolve()
  focarPrimeiroErroEm(raiz.value)
}

async function salvar() {
  if (salvando.value) return
  if (!form.validar()) {
    await focarPrimeiroErro()
    return
  }
  const payload = form.paraPayload()
  if (Object.keys(payload).length === 0) {
    emit('fechar')
    return
  }

  salvando.value = true
  try {
    emit('salvo', await editarProjeto(props.projeto.id, payload))
  } catch (erro) {
    form.tratarErroApi(erro)
    if (form.desatualizado.value) emit('desatualizado')
    await focarPrimeiroErro()
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Editar Projeto"
    :subtitulo="identificacao"
    icone="lapis"
    largura="560px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="editar"
      novalidate
      @submit.prevent="salvar"
    >
      <CampoFormulario
        v-model="form.campos.responsavelId"
        rotulo="Responsável:"
        tipo="select"
        obrigatorio
        placeholder="Selecione o funcionário responsável"
        :desabilitado="funcionarios.semPermissao.value"
        :opcoes="opcoesResponsavel"
        :erro="form.erros.responsavelId"
        :aviso="avisoResponsavel"
      />

      <div class="duas-colunas">
        <CampoData
          v-model="form.campos.previsaoInicio"
          rotulo="Previsão de início:"
          :ano-minimo="ANO_MINIMO_DATA_PROJETO"
          :erro="form.erros.previsaoInicio"
        />
        <CampoData
          v-model="form.campos.previsaoConclusao"
          rotulo="Previsão de conclusão:"
          :ano-minimo="ANO_MINIMO_DATA_PROJETO"
          :erro="form.erros.previsaoConclusao"
        />
      </div>

      <div
        class="endereco"
        role="group"
        aria-labelledby="editar-endereco"
      >
        <h4
          id="editar-endereco"
          class="endereco-titulo"
        >
          Endereço de entrega/serviço <span aria-hidden="true">*</span>
        </h4>

        <div class="cep-linha">
          <CampoFormulario
            v-model="form.campos.cep"
            class="cep-campo"
            rotulo="CEP:"
            obrigatorio
            placeholder="00000-000"
            inputmode="numeric"
            :mascara="mascararCep"
            :erro="form.erros.cep"
            @keydown.enter.prevent="form.buscarCep()"
          />
          <BotaoFp
            class="cep-botao"
            tamanho="pagina"
            :carregando="form.buscandoCep.value"
            @click="form.buscarCep()"
          >
            Buscar
          </BotaoFp>
        </div>

        <CampoFormulario
          v-model="form.campos.rua"
          rotulo="Rua:"
          obrigatorio
          placeholder="Digite a rua"
          autocomplete="off"
          :maxlength="150"
          :erro="form.erros.rua"
        />

        <div class="numero-bairro">
          <CampoFormulario
            v-model="form.campos.numero"
            rotulo="Número:"
            obrigatorio
            placeholder="000"
            autocomplete="off"
            :maxlength="20"
            :erro="form.erros.numero"
          />
          <CampoFormulario
            v-model="form.campos.bairro"
            rotulo="Bairro:"
            obrigatorio
            placeholder="Digite o bairro"
            autocomplete="off"
            :maxlength="100"
            :erro="form.erros.bairro"
          />
        </div>

        <div class="duas-colunas">
          <CampoFormulario
            :model-value="form.campos.estado"
            rotulo="Estado:"
            tipo="select"
            obrigatorio
            placeholder="Selecione o estado"
            :opcoes="opcoesEstado"
            :erro="form.erros.estado"
            @update:model-value="form.aoMudarEstado"
          />
          <!-- Select com as cidades do estado (IBGE). Se a lista não carregar, vira texto livre com aviso. -->
          <CampoFormulario
            v-if="form.cidades.indisponivel.value"
            v-model="form.campos.cidade"
            rotulo="Cidade:"
            obrigatorio
            placeholder="Digite a cidade"
            autocomplete="off"
            aviso="Lista de cidades indisponível. Digite o nome da cidade."
            :maxlength="100"
            :erro="form.erros.cidade"
          />
          <CampoFormulario
            v-else
            v-model="form.campos.cidade"
            rotulo="Cidade:"
            tipo="select"
            obrigatorio
            :placeholder="form.cidades.carregando.value ? 'Carregando cidades...' : 'Selecione a cidade'"
            :desabilitado="form.campos.estado === ''"
            :opcoes="form.cidades.opcoes.value"
            :erro="form.erros.cidade"
          />
        </div>

        <CampoFormulario
          v-model="form.campos.complemento"
          rotulo="Complemento:"
          placeholder="Apartamento, bloco, etc."
          autocomplete="off"
          :maxlength="150"
          :erro="form.erros.complemento"
        />
      </div>

      <ProjetoAvisoErro
        v-if="form.erroGeral.value"
        :mensagem="form.erroGeral.value"
      />
    </form>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="salvando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="salvando"
        :desabilitado="!form.alterado.value"
      >
        Salvar Alterações
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar alterações?"
    mensagem="As alterações feitas no projeto serão perdidas."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.editar {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.duas-colunas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.endereco {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.endereco-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 500;
}

.endereco-titulo span {
  color: var(--fp-obrigatorio);
}

.cep-linha {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.cep-campo {
  flex: 0 1 200px;
}

/* Alinha o botão ao input: altura do rótulo (21px) + espaço (6px). */
.cep-botao {
  flex-shrink: 0;
  margin-top: 27px;
  height: var(--campo-altura);
}

.numero-bairro {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
}

@media (max-width: 560px) {
  .duas-colunas,
  .numero-bairro {
    grid-template-columns: 1fr;
  }
}
</style>
