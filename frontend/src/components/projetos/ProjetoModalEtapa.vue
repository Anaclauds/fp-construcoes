<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioEtapaProjeto } from '../../composables/useFormularioEtapaProjeto'
import { useOpcoesProjeto } from '../../composables/useOpcoesProjeto'
import { useProjetoDetalhe } from '../../composables/useProjetoDetalhe'
import { registrarEtapa } from '../../services/projetos.service'
import type { ProjetoResumo } from '../../types/projeto'
import { focarPrimeiroErro } from '../../utils/foco'
import { centavosParaMoeda } from '../../utils/orcamentos'
import { totalMedidoEmCentavos } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'
import ProjetoCobrancaCampos from './ProjetoCobrancaCampos.vue'
import ProjetoCobrancaResumo from './ProjetoCobrancaResumo.vue'
import ProjetoEtapaMateriais from './ProjetoEtapaMateriais.vue'
import ProjetoEtapaServicos from './ProjetoEtapaServicos.vue'
import ProjetoQuadroResumo from './ProjetoQuadroResumo.vue'

const props = defineProps<{ projeto: ProjetoResumo }>()

const emit = defineEmits<{
  fechar: []
  registrado: []
  /** O backend indicou que o projeto mudou (não está mais em execução...): a lista precisa recarregar. */
  desatualizado: []
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')

const detalhe = useProjetoDetalhe(props.projeto.id, { comRecebimentos: false })
const opcoes = useOpcoesProjeto(props.projeto.orcamento.tipo)

// As etapas já registradas vêm do detalhe do projeto: delas sai o total já medido (o teto é o valor do orçamento).
const medido = computed(() => totalMedidoEmCentavos(detalhe.projeto.value?.etapas ?? []))
const form = useFormularioEtapaProjeto(props.projeto, opcoes.servicos, medido)

const enviando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

const pronto = computed(() => detalhe.projeto.value !== null && !opcoes.erro.value)
/** Medições já somam o valor do orçamento: nenhuma etapa nova cabe (o backend recusaria). */
const semSaldo = computed(() => pronto.value && form.saldoCentavos.value <= 0)
const carregando = computed(() => detalhe.carregando.value || opcoes.carregando.value)
const erroCarga = computed(() => detalhe.erro.value ?? opcoes.erro.value)

async function carregar() {
  await Promise.all([detalhe.carregar(), opcoes.carregar()])
}

onMounted(carregar)

const quantidadeEtapas = computed(() => detalhe.projeto.value?.etapas.length ?? 0)

const linhasResumo = computed(() => [
  { rotulo: 'Cliente:', valor: props.projeto.orcamento.cliente.nome },
  { rotulo: 'Valor Original:', valor: centavosParaMoeda(form.orcamentoCentavos) },
  {
    rotulo: `Já medido (${quantidadeEtapas.value} ${quantidadeEtapas.value === 1 ? 'etapa' : 'etapas'}):`,
    valor: centavosParaMoeda(medido.value),
  },
  { rotulo: 'Saldo disponível para medição:', valor: centavosParaMoeda(Math.max(0, form.saldoCentavos.value)) },
])

function pedirFechar() {
  if (form.alterado.value && !enviando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarErro() {
  await nextTick()
  focarPrimeiroErro(raiz.value, '[aria-invalid="true"], [data-erro]')
}

async function confirmar() {
  if (enviando.value || !pronto.value || semSaldo.value) return
  if (!form.validar()) {
    await focarErro()
    return
  }

  enviando.value = true
  try {
    await registrarEtapa(props.projeto.id, form.paraPayload(), form.paraPayload(true))
    emit('registrado')
  } catch (erro) {
    form.tratarErroApi(erro)
    if (form.desatualizado.value) emit('desatualizado')
    await focarErro()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Registrar Etapa"
    :subtitulo="`${projeto.orcamento.titulo} · Construção Civil`"
    icone="mais"
    largura="900px"
    :bloqueado="enviando"
    @fechar="pedirFechar"
  >
    <p
      v-if="carregando && !pronto"
      class="estado"
      role="status"
    >
      Carregando dados do projeto...
    </p>
    <p
      v-else-if="erroCarga"
      class="estado estado--erro"
      role="alert"
    >
      {{ erroCarga }}
      <button
        type="button"
        class="estado-tentar"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </p>

    <form
      v-else
      :id="idFormulario"
      ref="raiz"
      class="etapa"
      novalidate
      @submit.prevent="confirmar"
    >
      <p
        v-if="semSaldo"
        class="erro-subtotal aviso-saldo"
        role="alert"
      >
        Todo o valor do orçamento já foi medido. Não há saldo para nova etapa.
      </p>

      <ProjetoQuadroResumo :linhas="linhasResumo" />

      <CampoFormulario
        v-model="form.descricao.value"
        rotulo="Descrição da etapa:"
        tipo="area"
        obrigatorio
        placeholder="Ex: Processo de instalação de revestimentos (cerâmicas, porcelanatos, pedras, etc.) sobre o contrapiso..."
        :linhas="3"
        :maxlength="3000"
        :erro="form.erroDescricao.value"
      />

      <ProjetoEtapaServicos
        :linhas="form.linhas"
        :opcoes="opcoes.servicos.value"
        :erros="form.errosLinhas"
        :servicos-em-uso="form.servicosEmUso"
        :carregando="opcoes.carregando.value"
        @adicionar="form.adicionarServico"
        @remover="form.removerServico"
      />

      <p
        v-if="form.erroSubtotal.value"
        class="erro-subtotal"
        role="alert"
        tabindex="-1"
        data-erro
      >
        {{ form.erroSubtotal.value }}
      </p>

      <section class="cobranca">
        <h3 class="secao-titulo">
          Cobrança da etapa
        </h3>
        <ProjetoCobrancaCampos
          :campos="form.cobranca.campos"
          :erros="form.cobranca.erros"
          :parcelado="form.cobranca.parcelado.value"
          :acrescimo-habilitado="form.cobranca.acrescimoHabilitado.value"
          :resultado="form.cobranca.resultado.value"
        />
        <ProjetoCobrancaResumo
          :resultado="form.cobranca.resultado.value"
          :parcelado="form.cobranca.parcelado.value"
          :mostrar-acrescimo="form.cobranca.acrescimoHabilitado.value"
          :parcelas-validas="form.cobranca.parcelasValidas.value"
        />
        <p class="cobranca-nota">
          O subtotal é a soma de quantidade x valor unitário dos serviços executados. Esta etapa gera uma cobrança de medição;
          com ela, o total medido passa a {{ centavosParaMoeda(form.medidoComEstaEtapa.value) }} de {{ centavosParaMoeda(form.orcamentoCentavos) }}.
        </p>
      </section>

      <ProjetoEtapaMateriais
        :linhas="form.materiais"
        :erros="form.errosMateriais"
        @adicionar="form.adicionarMaterial"
        @remover="form.removerMaterial"
      />

      <ProjetoAvisoErro
        v-if="form.erroGeral.value"
        :mensagem="form.erroGeral.value"
        :estoque="form.erroEstoque.value"
      />
    </form>

    <template #rodape>
      <BotaoFp
        variante="neutro"
        :desabilitado="enviando"
        @click="pedirFechar"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        :form="idFormulario"
        :carregando="enviando"
        :desabilitado="!pronto || semSaldo"
      >
        Confirmar
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar etapa?"
    mensagem="Os dados informados para esta etapa serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.etapa {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.cobranca {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cobranca-nota {
  margin: 0;
  color: #6a7282;
  font-size: 12.5px;
}

.erro-subtotal {
  margin: -8px 0 0;
  padding: 10px 14px;
  border: 1px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.aviso-saldo {
  margin: 0;
}

.erro-subtotal:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(231, 0, 11, 0.2);
}

.estado {
  margin: 0;
  padding: 24px 17px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  color: #6a7282;
  font-size: 14px;
  text-align: center;
}

.estado--erro {
  border-color: #fca5a5;
  color: var(--fp-vermelho-escuro);
}

.estado-tentar {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}
</style>
