<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, useId, useTemplateRef } from 'vue'
import { useFormularioIniciarProjeto } from '../../composables/useFormularioIniciarProjeto'
import { buscarProjeto, iniciarProjeto } from '../../services/projetos.service'
import type { ProjetoResumo } from '../../types/projeto'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import { centavosParaMoeda, formatarNumeroOrcamento } from '../../utils/orcamentos'
import { ANO_MINIMO_DATA_PROJETO, enderecoDaObra, equivalenteEmMeses, textoDias } from '../../utils/projetos'
import { focarPrimeiroErro } from '../../utils/foco'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import ModalBase from '../ui/ModalBase.vue'
import ModalDescartar from '../ui/ModalDescartar.vue'
import ProjetoAvisoErro from './ProjetoAvisoErro.vue'
import ProjetoCobrancaCampos from './ProjetoCobrancaCampos.vue'
import ProjetoCobrancaResumo from './ProjetoCobrancaResumo.vue'
import ProjetoQuadroResumo from './ProjetoQuadroResumo.vue'

const props = defineProps<{ projeto: ProjetoResumo }>()

const emit = defineEmits<{
  fechar: []
  /** Projeto iniciado; leva a mensagem de sucesso e os avisos do servidor (se houver). */
  iniciado: [mensagem: string, avisos: string[]]
  /** O backend indicou que o projeto mudou (já iniciado...): a lista precisa recarregar. */
  desatualizado: []
}>()

const idFormulario = useId()
const raiz = useTemplateRef<HTMLElement>('raiz')
const form = useFormularioIniciarProjeto(props.projeto)
const etapa = shallowRef<1 | 2>(1)
const enviando = shallowRef(false)
const confirmandoSaida = shallowRef(false)

const { orcamento } = props.projeto
const codigo = formatarNumeroOrcamento(orcamento.numero)

const titulo = computed(() => {
  if (form.construcaoCivil) return 'Iniciar Projeto'
  return etapa.value === 1 ? 'Etapa 1/2 - Iniciar Projeto' : 'Etapa 2/2 - Realizar Cobrança do Projeto'
})

const nota = computed(() => {
  if (form.construcaoCivil) return 'O status será alterado para "Em Execução" e a obra será iniciada.'
  return etapa.value === 1
    ? 'O status será alterado para "Em Execução" e a cobrança será gerada.'
    : 'Ao confirmar, a cobrança será registrada conforme as condições selecionadas.'
})

const linhasInformacoes = computed(() => [
  { rotulo: 'Título:', valor: orcamento.titulo },
  { rotulo: 'Código:', valor: codigo },
  { rotulo: 'Cliente:', valor: orcamento.cliente.nome },
  { rotulo: 'Endereço:', valor: enderecoDaObra(props.projeto) },
])

const linhasCobranca = computed(() => {
  const { campos, resultado, parcelasValidas } = form.cobranca
  const linhas = [
    { rotulo: 'Projeto:', valor: `${codigo} - ${orcamento.titulo}` },
    { rotulo: 'Cliente:', valor: orcamento.cliente.nome },
    { rotulo: 'Valor Original:', valor: formatarMoeda(orcamento.valorTotal) },
  ]
  if (campos.modalidade === 'PARCELADO_AUTOMATICO' && parcelasValidas.value) {
    const { quantidade, valorParcela, valorUltimaParcela } = resultado.value
    const ultima = valorUltimaParcela !== valorParcela ? ` (última ${centavosParaMoeda(valorUltimaParcela)})` : ''
    linhas.push({ rotulo: 'Pagamento:', valor: `${quantidade}x ${centavosParaMoeda(valorParcela)}${ultima}` })
  }
  return linhas
})

const duracaoTexto = computed(() => (form.duracao.value === null ? '—' : textoDias(form.duracao.value)))

const sugestaoPrevisao = computed(() =>
  props.projeto.previsaoConclusao ? ` (Sugestão: ${isoParaDataBr(props.projeto.previsaoConclusao)})` : '',
)

function pedirFechar() {
  if (form.alterado.value && !enviando.value) confirmandoSaida.value = true
  else emit('fechar')
}

async function focarPrimeiroErroDoModal() {
  await nextTick()
  focarPrimeiroErro(raiz.value)
}

async function irParaEtapa(destino: 1 | 2) {
  etapa.value = destino
  await nextTick()
  // O botão clicado saiu da tela: leva o foco ao primeiro campo da nova etapa.
  raiz.value?.querySelector<HTMLElement>('input:not([tabindex="-1"]), select, button[role="radio"]')?.focus()
}

const verificandoEstoque = shallowRef(false)

/**
 * Confere o saldo de estoque antes de pedir qualquer dado: o detalhe do projeto (backend atualizado) diz se os
 * materiais do orçamento têm saldo para reservar. No backend antigo o campo não existe e nada é bloqueado
 * (a falta de saldo só aparece como erro ao confirmar). Falha na consulta também não bloqueia.
 */
async function verificarEstoque() {
  verificandoEstoque.value = true
  try {
    const detalhe = await buscarProjeto(props.projeto.id)
    const faltando = detalhe.estoqueSuficiente === false ? (detalhe.materiaisSemSaldo ?? []) : []
    form.semEstoque.value = faltando.length > 0
    form.materiaisSemSaldo.value = faltando
    if (!form.semEstoque.value) form.erroGeral.value = null
  } catch {
    form.semEstoque.value = false
  } finally {
    verificandoEstoque.value = false
  }
}

onMounted(verificarEstoque)

const textoSemEstoque =
  'Não há estoque suficiente para reservar os materiais deste projeto. Registre a compra em Despesas (ou ajuste o estoque) e verifique novamente.'

async function enviar() {
  enviando.value = true
  try {
    const resposta = await iniciarProjeto(props.projeto.id, form.paraPayload())
    emit(
      'iniciado',
      form.geraCobranca ? 'Cobrança Realizada!' : 'Projeto iniciado com sucesso!',
      resposta.avisos ?? [],
    )
  } catch (erro) {
    const onde = form.tratarErroApi(erro)
    if (form.desatualizado.value) emit('desatualizado')
    if (onde === 'cronograma' && etapa.value === 2) await irParaEtapa(1)
    await focarPrimeiroErroDoModal()
  } finally {
    enviando.value = false
  }
}

async function confirmar() {
  if (enviando.value || form.semEstoque.value) return

  if (etapa.value === 1) {
    if (!form.validarCronograma()) {
      await focarPrimeiroErroDoModal()
      return
    }
    // Serralheria e Calhas seguem para a cobrança; Construção Civil inicia já (a cobrança vem por etapa).
    if (form.geraCobranca) await irParaEtapa(2)
    else await enviar()
    return
  }

  if (!form.validarCobranca()) {
    await focarPrimeiroErroDoModal()
    return
  }
  await enviar()
}

const textoConfirmar = computed(() => {
  if (form.construcaoCivil) return 'Iniciar Projeto'
  return etapa.value === 1 ? 'Continuar para a cobrança →' : 'Confirmar cobrança'
})
</script>

<template>
  <ModalBase
    aberto
    :titulo="titulo"
    icone="check"
    largura="700px"
    :bloqueado="enviando"
    @fechar="pedirFechar"
  >
    <form
      :id="idFormulario"
      ref="raiz"
      class="iniciar"
      novalidate
      @submit.prevent="confirmar"
    >
      <div
        v-if="form.semEstoque.value"
        class="sem-estoque"
      >
        <ProjetoAvisoErro
          :mensagem="textoSemEstoque"
          :materiais="form.materiaisSemSaldo.value"
          estoque
          atencao
        />
        <BotaoFp
          variante="secundario"
          tamanho="compacto"
          :carregando="verificandoEstoque"
          @click="verificarEstoque"
        >
          Verificar novamente
        </BotaoFp>
      </div>

      <template v-if="etapa === 1">
        <ProjetoQuadroResumo
          titulo="Informações do Projeto"
          :linhas="linhasInformacoes"
          :total="{ rotulo: 'Valor Total:', valor: formatarMoeda(orcamento.valorTotal) }"
        />

        <div class="banner">
          <svg
            class="banner-icone"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 11v5M12 7.8h.01" />
          </svg>
          <div>
            <p class="banner-titulo">
              Iniciando a Obra
            </p>
            <p class="banner-texto">
              Defina quando a obra realmente começará. O status do projeto será alterado de "Planejado" para "Em Execução".
            </p>
          </div>
        </div>

        <section class="cronograma">
          <h3 class="secao-titulo">
            Cronograma da Obra
          </h3>
          <CampoData
            v-model="form.campos.dataInicio"
            rotulo="Data de Início da Obra"
            obrigatorio
            :ano-minimo="ANO_MINIMO_DATA_PROJETO"
            :erro="form.erros.dataInicio"
            :aviso="`Quando a obra está começando? (Sugestão: ${form.sugestaoInicio})`"
          />
          <CampoData
            v-model="form.campos.previsaoConclusao"
            rotulo="Previsão de Conclusão"
            :obrigatorio="form.construcaoCivil"
            :ano-minimo="ANO_MINIMO_DATA_PROJETO"
            :erro="form.erros.previsaoConclusao"
            :aviso="`Quando a obra deve ser concluída? (Pode ajustar a data prevista)${sugestaoPrevisao}`"
          />
        </section>

        <div
          class="duracao"
          aria-live="polite"
        >
          <p class="duracao-linha">
            <span>Duração total da obra:</span>
            <strong class="duracao-valor">{{ duracaoTexto }}</strong>
          </p>
          <p
            v-if="form.construcaoCivil && form.duracao.value !== null"
            class="duracao-linha duracao-linha--apoio"
          >
            <span>Equivalente a:</span>
            <strong>{{ equivalenteEmMeses(form.duracao.value) }}</strong>
          </p>
        </div>
      </template>

      <template v-else>
        <ProjetoQuadroResumo :linhas="linhasCobranca" />

        <ProjetoCobrancaCampos
          :campos="form.cobranca.campos"
          :erros="form.cobranca.erros"
          :parcelado="form.cobranca.parcelado.value"
          :acrescimo-habilitado="form.cobranca.acrescimoHabilitado.value"
          :resultado="form.cobranca.resultado.value"
        />

        <p
          v-if="form.cobranca.erros.valor"
          class="erro-valor"
          role="alert"
        >
          {{ form.cobranca.erros.valor }}
        </p>

        <ProjetoCobrancaResumo
          :resultado="form.cobranca.resultado.value"
          :parcelado="form.cobranca.parcelado.value"
          :mostrar-acrescimo="form.cobranca.acrescimoHabilitado.value"
          :parcelas-validas="form.cobranca.parcelasValidas.value"
        />
      </template>

      <ProjetoAvisoErro
        v-if="form.erroGeral.value"
        :mensagem="form.erroGeral.value"
        :estoque="form.erroEstoque.value"
        :materiais="form.materiaisSemSaldo.value"
      />
    </form>

    <template #rodape-esquerda>
      <p class="nota">
        {{ nota }}
      </p>
    </template>
    <template #rodape>
      <BotaoFp
        v-if="etapa === 2"
        variante="neutro"
        :desabilitado="enviando"
        @click="irParaEtapa(1)"
      >
        Voltar
      </BotaoFp>
      <BotaoFp
        v-else
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
        :desabilitado="form.semEstoque.value"
      >
        {{ textoConfirmar }}
      </BotaoFp>
    </template>
  </ModalBase>

  <ModalDescartar
    :aberto="confirmandoSaida"
    titulo="Descartar início do projeto?"
    mensagem="Os dados informados para iniciar este projeto serão perdidos."
    @confirmar="emit('fechar')"
    @fechar="confirmandoSaida = false"
  />
</template>

<style scoped>
.sem-estoque {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sem-estoque > :last-child {
  align-self: flex-start;
}

.iniciar {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.cronograma {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Figma: aviso "Iniciando a Obra" em cartão verde claro, com ícone de informação. */
.banner {
  display: flex;
  gap: 12px;
  padding: 16px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.banner-icone {
  flex-shrink: 0;
  margin-top: 1px;
  fill: none;
  stroke: var(--fp-verde);
  stroke-width: 2;
  stroke-linecap: round;
}

.banner-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 14px;
  font-weight: 600;
}

.banner-texto {
  margin: 2px 0 0;
  color: #4a5565;
  font-size: 13px;
  line-height: 1.5;
}

.duracao {
  padding: 14px 21px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.duracao-linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  color: #6a7282;
  font-size: 14px;
}

.duracao-linha strong {
  color: #333;
  font-weight: 600;
}

.duracao-valor {
  color: var(--fp-verde) !important;
  font-size: 20px;
  font-weight: 700 !important;
}

.duracao-linha--apoio {
  margin-top: 6px;
}

.erro-valor {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 13px;
}

.nota {
  max-width: 280px;
  margin: 0;
  color: #6a7282;
  font-size: 13px;
  line-height: 1.4;
}
</style>
