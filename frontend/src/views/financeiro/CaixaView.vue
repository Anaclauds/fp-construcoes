<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import CaixaCabecalho from '../../components/caixa/CaixaCabecalho.vue'
import CaixaImpressao from '../../components/caixa/CaixaImpressao.vue'
import CaixaModalFechar from '../../components/caixa/CaixaModalFechar.vue'
import CaixaModalRecebimentos from '../../components/caixa/CaixaModalRecebimentos.vue'
import CaixaModalValorInicial from '../../components/caixa/CaixaModalValorInicial.vue'
import CaixaResumo from '../../components/caixa/CaixaResumo.vue'
import CaixaSeletorMes from '../../components/caixa/CaixaSeletorMes.vue'
import CaixaTabelaMovimentacoes from '../../components/caixa/CaixaTabelaMovimentacoes.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import ModalConfirmacao from '../../components/ui/ModalConfirmacao.vue'
import { useAcoesCaixa } from '../../composables/useAcoesCaixa'
import { useAuth } from '../../composables/useAuth'
import { useCaixaDoMes } from '../../composables/useCaixaDoMes'
import { useToast } from '../../composables/useToast'
import type { Caixa } from '../../types/caixa'
import { caixaNaoAberto, herdaSaldoAnterior, nomeDoMes, rotuloCompetencia } from '../../utils/caixa'
import { formatarDataHoraIso } from '../../utils/formatadores'

type Modal = 'fechar' | 'valor-inicial' | 'reabrir' | 'recebimentos' | null


const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('CAIXA', 'gerenciar'))
// O relatório de recebimentos aceita visualizar Cobranças ou Caixa (a API libera os dois).
const podeVerRecebimentos = computed(() => temPermissao('COBRANCAS', 'visualizar') || temPermissao('CAIXA', 'visualizar'))

const mes = useCaixaDoMes('caixa')
const acoes = useAcoesCaixa()

const modal = shallowRef<Modal>(null)
const imprimindo = shallowRef(false)

// Competência ainda não aberta (`id: 0`): só aceita "Abrir caixa"; nunca fechar nem reabrir.
const naoAberto = computed(() => (mes.caixa.value ? caixaNaoAberto(mes.caixa.value) : false))
// Antes do primeiro caixa existente o servidor criaria um caixa fora da ordem: não oferece abertura.
const antesDoPrimeiro = computed(() => {
  const minima = mes.caixa.value?.competenciaMinima
  return naoAberto.value && !!minima && mes.competencia.value < minima
})
const aberto = computed(() => mes.caixa.value?.status === 'ABERTO' && !naoAberto.value)
const fechado = computed(() => mes.caixa.value?.status === 'FECHADO')
const pendente = computed(() => mes.situacao.value === 'PENDENTE_FECHAMENTO')
const emAndamento = computed(() => mes.situacao.value === 'EM_ANDAMENTO')
const podeFechar = computed(() => mes.caixa.value?.podeFechar === true)

const podeReabrir = computed(() => podeGerenciar.value && fechado.value)

// O valor inicial só se redefine no primeiro caixa e antes dos lançamentos (o servidor recusa depois, e herda o saldo anterior).
const podeAlterarInicial = computed(() => {
  const caixa = mes.caixa.value
  if (!caixa || !podeGerenciar.value || !aberto.value || herdaSaldoAnterior(caixa)) return false
  return caixa.entradas.length === 0 && caixa.saidas.length === 0
})

/** Texto abaixo do botão de fechar quando ele está bloqueado. */
const legendaFechar = computed(() => {
  if (!podeGerenciar.value || !aberto.value || podeFechar.value) return ''
  if (emAndamento.value) return 'Disponível após o encerramento do mês.'
  return 'Feche os meses anteriores primeiro.'
})

const fechadoPor = computed(() => {
  const usuario = mes.caixa.value?.fechadoPorUsuario
  return usuario ? (usuario.funcionario?.nomeCompleto ?? usuario.login) : ''
})

function fecharModal() {
  modal.value = null
  acoes.erro.value = null
}

function aoFechar(caixa: Caixa) {
  fecharModal()
  mes.aplicar(caixa)
  mostrarToast('Fechamento Realizado!')
}

/** Outra tela fechou/abriu o caixa antes desta ação: mostra o caixa como está agora, sem pedir para recarregar. */
function aoDesatualizar() {
  fecharModal()
  void mes.carregar()
  mostrarToast('Este caixa foi alterado em outra tela. Os dados foram atualizados.', 'info')
}

function aoSalvarValorInicial(caixa: Caixa) {
  const abriu = naoAberto.value
  fecharModal()
  mes.aplicar(caixa)
  mostrarToast(abriu ? 'Caixa aberto!' : 'Salvo com sucesso!')
}

async function reabrir() {
  const caixa = mes.caixa.value
  if (!caixa) return
  const resultado = await acoes.reabrir(caixa.id)
  if (resultado) {
    modal.value = null
    mes.aplicar(resultado)
    mostrarToast('Caixa reaberto.')
  } else if (acoes.desatualizado.value) {
    aoDesatualizar()
  }
}

/** Mesma limitação do Relatório de Frequência: o diálogo de impressão não informa se o PDF foi salvo. */
function aoConcluirImpressao() {
  imprimindo.value = false
  mostrarToast('Impressão concluída.', 'info')
}

onMounted(mes.carregar)
</script>

<template>
  <section class="pagina">
    <CaixaCabecalho
      subtitulo="Controle de entradas e saídas mensais"
      :situacao="mes.situacao.value"
    />

    <div class="barra">
      <CaixaSeletorMes
        :competencia="mes.competencia.value"
        :pode-voltar="mes.podeVoltar.value"
        :pode-avancar="mes.podeAvancar.value"
        :fora-do-mes-atual="!mes.noMesAtual.value"
        @anterior="mes.anterior"
        @proximo="mes.proximo"
        @mes-atual="mes.irParaMesAtual"
      />

      <div class="barra-acoes">
        <div class="botoes">
          <BotaoFp
            v-if="podeVerRecebimentos"
            variante="secundario"
            tamanho="pagina"
            @click="modal = 'recebimentos'"
          >
            Recebimentos
          </BotaoFp>
          <BotaoFp
            variante="secundario"
            tamanho="pagina"
            :desabilitado="!mes.caixa.value || naoAberto"
            @click="imprimindo = true"
          >
            Imprimir
          </BotaoFp>
          <BotaoFp
            v-if="podeGerenciar && naoAberto && !antesDoPrimeiro"
            tamanho="pagina"
            @click="modal = 'valor-inicial'"
          >
            Abrir Caixa
          </BotaoFp>
          <BotaoFp
            v-if="podeReabrir"
            variante="secundario"
            tamanho="pagina"
            @click="modal = 'reabrir'"
          >
            Reabrir Mês
          </BotaoFp>
          <BotaoFp
            v-if="podeGerenciar && aberto"
            tamanho="pagina"
            :desabilitado="!podeFechar"
            @click="modal = 'fechar'"
          >
            {{ pendente ? 'Revisar e Fechar Mês' : 'Fechar Mês' }}
          </BotaoFp>
        </div>
        <p
          v-if="legendaFechar"
          class="legenda"
        >
          {{ legendaFechar }}
        </p>
      </div>
    </div>

    <section
      v-if="mes.caixa.value && naoAberto"
      class="nao-aberto"
      role="status"
    >
      <h2>O caixa de {{ rotuloCompetencia(mes.competencia.value) }} ainda não foi aberto</h2>
      <p v-if="antesDoPrimeiro">
        Este mês é anterior ao primeiro caixa registrado e não pode ser aberto.
      </p>
      <p v-else-if="podeGerenciar">
        Abra o caixa para registrar despesas e recebimentos neste mês.
        <template v-if="herdaSaldoAnterior(mes.caixa.value)">
          O valor inicial será o saldo final do mês anterior, que precisa estar fechado.
        </template>
        <template v-else>
          Como é o primeiro caixa, você informa o valor inicial.
        </template>
      </p>
      <p v-else>
        Peça a quem gerencia o caixa para abri-lo.
      </p>
    </section>

    <template v-else-if="mes.caixa.value">
      <CaixaResumo
        :resumo="mes.caixa.value.resumo"
        :fechado="fechado"
        :pode-alterar-inicial="podeAlterarInicial"
        @alterar-inicial="modal = 'valor-inicial'"
      />

      <p
        v-if="pendente"
        class="faixa faixa--aviso"
        role="status"
      >
        O mês de {{ nomeDoMes(mes.competencia.value) }} terminou e aguarda fechamento.
      </p>
      <p
        v-else-if="fechado && mes.caixa.value.fechadoEm"
        class="faixa"
      >
        Fechado em {{ formatarDataHoraIso(mes.caixa.value.fechadoEm) }}<template v-if="fechadoPor">
          por {{ fechadoPor }}</template>. Nenhum lançamento pode ser adicionado ou alterado neste mês.
      </p>

      <div class="tabelas">
        <CaixaTabelaMovimentacoes
          tipo="entradas"
          :movimentacoes="mes.caixa.value.entradas"
          :total="mes.caixa.value.resumo.totalEntradas"
        />
        <CaixaTabelaMovimentacoes
          tipo="saidas"
          :movimentacoes="mes.caixa.value.saidas"
          :total="mes.caixa.value.resumo.totalSaidas"
        />
      </div>
    </template>

    <p
      v-else-if="mes.erro.value"
      class="mensagem mensagem--erro"
      role="alert"
    >
      {{ mes.erro.value }}
      <button
        type="button"
        class="tentar-novamente"
        @click="mes.carregar"
      >
        Tentar novamente
      </button>
    </p>
    <p
      v-else
      class="mensagem"
      role="status"
    >
      Carregando o caixa de {{ rotuloCompetencia(mes.competencia.value) }}...
    </p>

    <CaixaModalFechar
      v-if="modal === 'fechar' && mes.caixa.value"
      :caixa="mes.caixa.value"
      @fechar="fecharModal"
      @fechado="aoFechar"
      @desatualizado="aoDesatualizar"
    />
    <CaixaModalValorInicial
      v-else-if="modal === 'valor-inicial' && mes.caixa.value"
      :caixa="mes.caixa.value"
      @fechar="fecharModal"
      @salvo="aoSalvarValorInicial"
      @desatualizado="aoDesatualizar"
    />
    <CaixaModalRecebimentos
      v-else-if="modal === 'recebimentos'"
      :competencia="mes.competencia.value"
      @fechar="fecharModal"
    />

    <ModalConfirmacao
      :aberto="modal === 'reabrir'"
      titulo="Reabrir Caixa"
      :subtitulo="rotuloCompetencia(mes.competencia.value)"
      variante="sucesso"
      titulo-aviso="Atenção"
      pergunta="Deseja reabrir este mês?"
      texto-confirmar="Reabrir Mês"
      :carregando="acoes.executando.value"
      :erro="acoes.erro.value"
      @confirmar="reabrir"
      @fechar="fecharModal"
    >
      O caixa de {{ nomeDoMes(mes.competencia.value) }} voltará a aceitar lançamentos e o saldo poderá mudar. Feche o mês
      novamente depois de conferir.
    </ModalConfirmacao>

    <CaixaImpressao
      v-if="imprimindo && mes.caixa.value"
      :caixa="mes.caixa.value"
      @concluido="aoConcluirImpressao"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  /* A largura útil depende do menu lateral (aberto ou recolhido): o layout das tabelas segue o contêiner, não a janela. */
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 20px;
}

/* Seletor de mês à esquerda; ações à direita (Figma: "Fechar Mês" com a legenda embaixo). */
.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 16px;
  margin-top: 8px;
}

.barra-acoes {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  /* Reserva o espaço do logo fixo no canto superior direito, como as demais telas. */
  margin-right: 90px;
}

.botoes {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.legenda {
  margin: 0;
  color: #717182;
  font-size: 12.5px;
}

.faixa {
  margin: 0;
  padding: 10px 16px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
  color: #4a5565;
  font-size: 13.5px;
}

.faixa--aviso {
  border-color: #fcd34d;
  background-color: #fffbeb;
  color: #b45309;
  font-weight: 500;
}

/* Entradas e Saídas lado a lado, no mesmo cartão (Figma). */
.tabelas {
  flex: 1 1 0;
  min-height: 320px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: minmax(0, 1fr);

  border: 1.5px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: #fff;
  box-shadow: var(--fp-sombra-card);
  overflow: hidden;
}

.tabelas > :last-child {
  border-left: 1px solid var(--fp-cinza-borda);
}

.nao-aberto {
  padding: 36px 24px;
  border: 1.5px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
  text-align: center;
}

.nao-aberto h2 {
  margin: 0 0 6px;
  color: var(--fp-verde);
  font-size: 20px;
  font-weight: 600;
}

.nao-aberto p {
  margin: 0;
  color: #4a5565;
  font-size: 14px;
}

.mensagem {
  margin: 40px 0;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
}

.mensagem--erro {
  color: var(--fp-vermelho-escuro);
}

.tentar-novamente {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

/* Pouco espaço para duas tabelas lado a lado: Entradas e Saídas empilham, cada uma com sua rolagem. */
@container (max-width: 1060px) {
  .tabelas {
    flex: none;
    min-height: 0;
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .tabelas > :last-child {
    border-top: 1px solid var(--fp-cinza-borda);
    border-left: 0;
  }

  .tabelas :deep(.lado-corpo) {
    flex: none;
    max-height: 320px;
  }
}
</style>
