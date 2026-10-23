<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import CaixaCabecalho from '../../components/caixa/CaixaCabecalho.vue'
import CaixaImpressao from '../../components/caixa/CaixaImpressao.vue'
import CaixaModalHistorico from '../../components/caixa/CaixaModalHistorico.vue'
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
import {
  caixaNaoAberto,
  herdaSaldoAnterior,
  nomeDoMes,
  rotuloCompetencia,
  situacaoAbertura,
} from '../../utils/caixa'
import { formatarDataHoraIso } from '../../utils/formatadores'

type Modal = 'fechar' | 'valor-inicial' | 'reabrir' | 'recebimentos' | 'historico' | null


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
// Só se abre competência depois do último caixa (ou o primeiro, se não houver nenhum): meses no meio quebrariam a
// continuidade dos saldos, e o servidor também herda o saldo do último caixa anterior.
const aberturaDaCompetencia = computed(() =>
  naoAberto.value
    ? situacaoAbertura(mes.competencia.value, mes.caixa.value?.competenciaMinima ?? null, mes.ultimaCompetencia.value)
    : 'liberada',
)
const podeAbrir = computed(() => podeGerenciar.value && naoAberto.value && aberturaDaCompetencia.value === 'liberada')
const aberto = computed(() => mes.caixa.value?.status === 'ABERTO' && !naoAberto.value)
const fechado = computed(() => mes.caixa.value?.status === 'FECHADO')
const pendente = computed(() => mes.situacao.value === 'PENDENTE_FECHAMENTO')
const emAndamento = computed(() => mes.situacao.value === 'EM_ANDAMENTO')
const podeFechar = computed(() => mes.caixa.value?.podeFechar === true)

// O servidor recusa reabrir com caixa posterior: só o último caixa existente pode ser reaberto. Com o último
// ainda desconhecido (consulta falhou) o botão fica liberado e o servidor decide.
const ehUltimoCaixa = computed(() => mes.ultimaCompetencia.value === undefined || mes.ultimaCompetencia.value === mes.competencia.value)
const mostrarReabrir = computed(() => podeGerenciar.value && fechado.value)
const podeReabrir = computed(() => mostrarReabrir.value && ehUltimoCaixa.value)

// O valor inicial só se redefine no primeiro caixa e antes dos lançamentos (o servidor recusa depois, e herda o saldo anterior).
const podeAlterarInicial = computed(() => {
  const caixa = mes.caixa.value
  if (!caixa || !podeGerenciar.value || !aberto.value || herdaSaldoAnterior(caixa)) return false
  return caixa.entradas.length === 0 && caixa.saidas.length === 0
})

/** Texto abaixo dos botões quando fechar ou reabrir está bloqueado. */
const legendaAcoes = computed(() => {
  if (mostrarReabrir.value && !ehUltimoCaixa.value) return 'Só o último caixa pode ser reaberto.'
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
  mostrarToast('Caixa fechado!')
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
  mostrarToast(abriu ? 'Caixa aberto!' : 'Valor inicial atualizado!')
}

async function reabrir() {
  const caixa = mes.caixa.value
  if (!caixa) return
  const resultado = await acoes.reabrir(caixa.id)
  if (resultado) {
    modal.value = null
    mes.aplicar(resultado)
    mostrarToast('Caixa reaberto!')
  } else if (acoes.desatualizado.value) {
    aoDesatualizar()
  }
}

/** O diálogo de impressão não informa se o PDF foi salvo ou impresso: só o fecha, sem afirmar sucesso. */
function aoConcluirImpressao() {
  imprimindo.value = false
}

/** Linha do histórico escolhida: fecha o modal e abre a competência (a URL guarda o mês). */
async function abrirCompetencia(competencia: string) {
  fecharModal()
  await mes.irPara(competencia)
}

onMounted(mes.carregar)
</script>

<template>
  <section
    class="pagina"
    :class="{ 'pagina--recarregando': mes.carregando.value && !!mes.caixa.value }"
    :aria-busy="mes.carregando.value"
  >
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
            variante="secundario"
            tamanho="pagina"
            @click="modal = 'historico'"
          >
            Histórico de caixas
          </BotaoFp>
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
            v-if="podeAbrir"
            tamanho="pagina"
            @click="modal = 'valor-inicial'"
          >
            Abrir Caixa
          </BotaoFp>
          <BotaoFp
            v-if="mostrarReabrir"
            variante="secundario"
            tamanho="pagina"
            :desabilitado="!podeReabrir"
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
          v-if="legendaAcoes"
          class="legenda"
        >
          {{ legendaAcoes }}
        </p>
      </div>
    </div>

    <section
      v-if="mes.caixa.value && naoAberto"
      class="nao-aberto"
      role="status"
    >
      <h2>O caixa de {{ rotuloCompetencia(mes.competencia.value) }} ainda não foi aberto</h2>
      <p v-if="aberturaDaCompetencia === 'antes-do-primeiro'">
        Este mês é anterior ao primeiro caixa registrado e não pode ser aberto.
      </p>
      <p v-else-if="aberturaDaCompetencia === 'no-intervalo'">
        Este mês fica entre caixas já existentes e não pode ser aberto depois: isso quebraria a continuidade dos saldos.
        Só é possível abrir meses posteriores ao último caixa.
      </p>
      <p v-else-if="podeGerenciar">
        Abra o caixa para registrar despesas e recebimentos neste mês.
        <template v-if="herdaSaldoAnterior(mes.caixa.value)">
          O valor inicial será o saldo final do último caixa, que precisa estar fechado.
        </template>
        <template v-else>
          Como é o primeiro caixa, você informa o valor inicial.
        </template>
      </p>
      <p v-else>
        Peça a quem gerencia o caixa para abri-lo.
      </p>
    </section>

    <div
      v-else-if="mes.caixa.value"
      class="conteudo"
    >
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
    </div>

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

    <CaixaModalHistorico
      v-else-if="modal === 'historico'"
      @fechar="fecharModal"
      @selecionar="abrirCompetencia"
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

/* Recarga de um caixa já na tela (mesmo mês): esmaece o conteúdo sem mexer no layout. */
.conteudo {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: opacity 0.15s ease;
}

.pagina--recarregando .conteudo {
  opacity: 0.55;
  pointer-events: none;
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
}

/* Reserva o espaço do logo fixo no canto superior direito, como as demais telas (só onde ele não sobrepõe o conteúdo). */
@media (min-width: 768px) {
  .barra-acoes {
    margin-right: 90px;
  }
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
