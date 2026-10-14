<script setup lang="ts">
import { computed, onMounted, shallowRef, useId, useTemplateRef, watch } from 'vue'
import { useClienteCompleto } from '../../composables/useClienteCompleto'
import { useFormularioAprovacao } from '../../composables/useFormularioAprovacao'
import { useResponsaveisOrcamento } from '../../composables/useResponsaveisOrcamento'
import { aprovarOrcamento } from '../../services/orcamentos.service'
import type { Orcamento, RespostaAprovacao } from '../../types'
import { formatarMoeda, mascararCep, rotuloLegivel } from '../../utils/formatadores'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import { UFS, montarOpcoes } from '../../utils/opcoes-cliente'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import { focarPrimeiroErro as focarPrimeiroErroEm } from '../../utils/foco'

const props = defineProps<{ orcamento: Orcamento }>()

const emit = defineEmits<{
  fechar: []
  aprovado: [resposta: RespostaAprovacao]
  /** O backend indicou que o orçamento mudou (já aprovado, cancelado...): a lista precisa recarregar. */
  desatualizado: []
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const form = useFormularioAprovacao()
const funcionarios = useResponsaveisOrcamento()
const { cliente, carregando: carregandoCliente, semAcesso: semAcessoClientes } = useClienteCompleto(props.orcamento.clienteId)
const salvando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

onMounted(() => void funcionarios.carregar())

// O endereço da obra nasce igual ao do cliente (e continua editável).
watch(cliente, (valor) => {
  if (valor) form.preencherComCliente(valor)
})

// Sem acesso ao cadastro do cliente (ou se a consulta falhar), ao menos cidade/UF vêm do próprio orçamento.
const enderecoIndisponivel = computed(() => !carregandoCliente.value && cliente.value === null)
watch(
  enderecoIndisponivel,
  (indisponivel) => {
    if (indisponivel) form.preencherComCliente(props.orcamento.cliente)
  },
  { immediate: true },
)

const notaEnderecoIndisponivel = computed(() =>
  semAcessoClientes.value
    ? 'Endereço completo do cliente indisponível (sem acesso a Clientes) — preencha manualmente.'
    : 'Endereço completo do cliente indisponível — preencha manualmente.',
)

const opcoesResponsavel = computed(() =>
  funcionarios.funcionarios.value
    .filter((f) => f.status === 'ATIVO')
    .map((f) => ({ valor: String(f.id), rotulo: f.funcao ? `${f.nomeCompleto} — ${rotuloLegivel(f.funcao)}` : f.nomeCompleto })),
)

const placeholderResponsavel = computed(() => {
  if (funcionarios.semPermissao.value) return 'Sem permissão para listar funcionários'
  if (funcionarios.carregando.value) return 'Carregando funcionários...'
  return 'Selecione o funcionário responsável pela negociação'
})

const avisoResponsavel = computed(() => {
  if (funcionarios.semPermissao.value) {
    return 'Seu perfil não pode listar funcionários. Peça acesso aos módulos Funcionários ou Frequência para escolher o responsável.'
  }
  if (funcionarios.erro.value) return funcionarios.erro.value
  if (!funcionarios.carregando.value && opcoesResponsavel.value.length === 0) return 'Nenhum funcionário ativo encontrado.'
  return undefined
})

const opcoesEstado = montarOpcoes(UFS)
const identificacao = computed(() => `${formatarNumeroOrcamento(props.orcamento.numero)} · ${props.orcamento.titulo}`)

/** Alterou algum dado (qualquer coisa além do endereço sugerido): pede confirmação ao descartar. */
const alterado = computed(
  () =>
    form.campos.responsavelId !== '' ||
    form.campos.previsaoInicio !== '' ||
    form.campos.previsaoTermino !== '',
)

function pedirFechar() {
  if (alterado.value && !salvando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErro() {
  await Promise.resolve()
  focarPrimeiroErroEm(raiz.value)
}

async function confirmar() {
  if (funcionarios.semPermissao.value) return
  if (!form.validar()) {
    await focarPrimeiroErro()
    return
  }

  salvando.value = true
  try {
    const resposta = await aprovarOrcamento(props.orcamento.id, form.paraPayload())
    emit('aprovado', resposta)
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
    titulo="Aprovar Orçamento"
    icone="check"
    largura="500px"
    :bloqueado="salvando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="aprovar"
      novalidate
      @submit.prevent="confirmar"
    >
      <div class="resumo">
        <p class="resumo-orcamento">
          {{ identificacao }}
        </p>
        <div class="resumo-linha">
          <div>
            <p class="resumo-rotulo">
              Valor do orçamento
            </p>
            <p class="resumo-valor">
              {{ formatarMoeda(orcamento.valorTotal) }}
            </p>
          </div>
          <div class="resumo-cliente">
            <p class="resumo-rotulo">
              Cliente
            </p>
            <p class="resumo-nome">
              {{ orcamento.cliente.nome }}
            </p>
          </div>
        </div>
      </div>

      <p class="aviso">
        Ao aprovar, este orçamento será convertido em projeto. Informe o responsável, as previsões e o endereço da
        obra. As cobranças só são geradas quando o projeto for iniciado.
      </p>

      <CampoFormulario
        v-model="form.campos.responsavelId"
        rotulo="Responsável:"
        tipo="select"
        obrigatorio
        :placeholder="placeholderResponsavel"
        :desabilitado="funcionarios.semPermissao.value || funcionarios.carregando.value"
        :opcoes="opcoesResponsavel"
        :erro="form.erros.responsavelId"
        :aviso="avisoResponsavel"
      />

      <div class="duas-colunas">
        <CampoData
          v-model="form.campos.previsaoInicio"
          rotulo="Previsão de início:"
          obrigatorio
          :erro="form.erros.previsaoInicio"
        />
        <CampoData
          v-model="form.campos.previsaoTermino"
          rotulo="Previsão de término:"
          obrigatorio
          :erro="form.erros.previsaoTermino"
        />
      </div>

      <div
        class="endereco"
        role="group"
        aria-labelledby="aprovar-endereco"
      >
        <h4
          id="aprovar-endereco"
          class="endereco-titulo"
        >
          Endereço de entrega/serviço <span aria-hidden="true">*</span>
        </h4>
        <p
          v-if="carregandoCliente"
          class="endereco-nota"
        >
          Carregando o endereço do cliente...
        </p>
        <p
          v-else-if="enderecoIndisponivel"
          class="endereco-nota"
        >
          {{ notaEnderecoIndisponivel }}
        </p>
        <p
          v-else-if="form.enderecoDoCliente.value"
          class="endereco-nota"
        >
          Preenchido com o endereço do cliente. Altere se a obra for em outro local.
        </p>

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
            v-model="form.campos.cidade"
            rotulo="Cidade:"
            obrigatorio
            placeholder="Digite a cidade"
            autocomplete="off"
            :maxlength="100"
            :erro="form.erros.cidade"
          />
          <CampoFormulario
            v-model="form.campos.estado"
            rotulo="Estado:"
            tipo="select"
            obrigatorio
            placeholder="Selecione o estado"
            :opcoes="opcoesEstado"
            :erro="form.erros.estado"
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
        :desabilitado="funcionarios.semPermissao.value"
      >
        Confirmar Aprovação
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar aprovação?"
    mensagem="Os dados informados para a aprovação serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.aprovar {
  --campo-altura: 40px;

  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resumo {
  padding: 14px 18px;
  border: 1px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.resumo-orcamento {
  margin: 0 0 8px;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.resumo-linha {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.resumo-rotulo {
  margin: 0;
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.resumo-valor {
  margin: 0;
  color: var(--fp-verde);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.2;
}

.resumo-cliente {
  min-width: 0;
  text-align: right;
}

.resumo-nome {
  margin: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.aviso {
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fef3c7;

  color: #92400e;
  font-size: 13.5px;
  line-height: 1.45;
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

.endereco-nota {
  margin: -4px 0 0;
  color: #717182;
  font-size: 12.5px;
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

.erro-geral {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

@media (max-width: 560px) {
  .duas-colunas,
  .numero-bairro {
    grid-template-columns: 1fr;
  }
}
</style>
