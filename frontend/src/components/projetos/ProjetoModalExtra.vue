<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioExtraProjeto } from '../../composables/useFormularioExtraProjeto'
import { useOpcoesProjeto } from '../../composables/useOpcoesProjeto'
import { suporte } from '../../services/compatibilidade'
import { registrarExtra } from '../../services/projetos.service'
import type { ProjetoResumo } from '../../types/projeto'
import { focarPrimeiroErro } from '../../utils/foco'
import { formatarMoeda } from '../../utils/formatadores'
import { centavosParaMoeda } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'
import ProjetoExtraGastos from './ProjetoExtraGastos.vue'
import ProjetoExtraMateriais from './ProjetoExtraMateriais.vue'
import ProjetoExtraServicos from './ProjetoExtraServicos.vue'
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

const opcoes = useOpcoesProjeto(props.projeto.orcamento.tipo, { materiais: true })
const form = useFormularioExtraProjeto(opcoes.materiais, opcoes.servicos)

const enviando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

onMounted(opcoes.carregar)

const linhasResumo = computed(() => [
  { rotulo: 'Cliente:', valor: props.projeto.orcamento.cliente.nome },
  { rotulo: 'Valor Original:', valor: formatarMoeda(props.projeto.orcamento.valorTotal) },
])

const resumoCustos = computed(() => [
  { rotulo: 'Materiais adicionais (reserva de estoque)', valor: centavosParaMoeda(form.custoMateriais.value) },
  { rotulo: 'Serviços adicionais (despesa e saída no caixa)', valor: centavosParaMoeda(form.custoServicos.value) },
  ...(suporte.gastosAvulsos
    ? [{ rotulo: 'Gastos avulsos (despesa e saída no caixa)', valor: centavosParaMoeda(form.custoGastos.value) }]
    : []),
])

const custoTotal = computed(() => form.custoMateriais.value + form.custoServicos.value + form.custoGastos.value)

function pedirFechar() {
  if (form.alterado.value && !enviando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarErro() {
  await nextTick()
  focarPrimeiroErro(raiz.value, '[aria-invalid="true"], [data-erro]')
}

async function confirmar() {
  if (enviando.value || opcoes.carregando.value) return
  if (!form.validar()) {
    await focarErro()
    return
  }

  enviando.value = true
  try {
    await registrarExtra(props.projeto.id, form.paraPayload(), form.paraPayload(true))
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
    titulo="Registrar Extra"
    :subtitulo="projeto.orcamento.titulo"
    icone="mais"
    largura="900px"
    :bloqueado="enviando"
    @fechar="pedirFechar"
  >
    <p
      v-if="opcoes.erro.value"
      class="estado estado--erro"
      role="alert"
    >
      {{ opcoes.erro.value }}
      <button
        type="button"
        class="estado-tentar"
        @click="opcoes.carregar"
      >
        Tentar novamente
      </button>
    </p>

    <form
      v-else
      :id="idFormulario"
      ref="raiz"
      class="extra"
      novalidate
      @submit.prevent="confirmar"
    >
      <ProjetoQuadroResumo :linhas="linhasResumo" />

      <CampoFormulario
        v-model="form.descricao.value"
        rotulo="Descrição/Justificativa da Adição:"
        tipo="area"
        obrigatorio
        placeholder="Ex: Necessário adicionar reforço estrutural devido a alteração no projeto..."
        :linhas="3"
        :maxlength="3000"
        :erro="form.erroDescricao.value"
      />

      <ProjetoExtraMateriais
        :linhas="form.materiais"
        :opcoes="opcoes.materiais.value"
        :erros="form.errosMateriais"
        :materiais-em-uso="form.materiaisEmUso"
        :carregando="opcoes.carregando.value"
        @adicionar="form.adicionarMaterial"
        @remover="form.removerMaterial"
      />

      <ProjetoExtraServicos
        :linhas="form.servicos"
        :opcoes="opcoes.servicos.value"
        :erros="form.errosServicos"
        :servicos-em-uso="form.servicosEmUso"
        :carregando="opcoes.carregando.value"
        @adicionar="form.adicionarServico"
        @remover="form.removerServico"
      />

      <ProjetoExtraGastos
        v-if="suporte.gastosAvulsos"
        :linhas="form.gastos"
        :erros="form.errosGastos"
        @adicionar="form.adicionarGasto"
        @remover="form.removerGasto"
      />

      <p
        v-if="form.erroItens.value"
        class="erro-itens"
        role="alert"
        tabindex="-1"
        data-erro
      >
        {{ form.erroItens.value }}
      </p>

      <ProjetoQuadroResumo
        :linhas="resumoCustos"
        :total="{ rotulo: 'Custo interno estimado:', valor: centavosParaMoeda(custoTotal) }"
      />
      <p class="nota">
        O extra não gera cobrança para o cliente: os valores acima são custos internos estimados.
      </p>

      <ProjetoAvisoErro
        v-if="form.erroGeral.value"
        :mensagem="form.erroGeral.value"
        :estoque="form.erroEstoque.value"
        :materiais="form.materiaisSemSaldo.value"
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
        :desabilitado="!!opcoes.erro.value"
      >
        Confirmar
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar extra?"
    mensagem="Os dados informados para este extra serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.extra {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.nota {
  margin: -10px 0 0;
  color: #6a7282;
  font-size: 12.5px;
}

.erro-itens {
  margin: -8px 0 0;
  padding: 10px 14px;
  border: 1px solid #fca5a5;
  border-radius: var(--fp-raio);
  background-color: #fef2f2;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

.erro-itens:focus {
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
