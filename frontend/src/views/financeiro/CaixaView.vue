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
import { nomeDoMes, rotuloCompetencia } from '../../utils/caixa'
import { formatarDataHoraIso } from '../../utils/formatadores'

type Modal = 'fechar' | 'valor-inicial' | 'reabrir' | 'recebimentos' | null

const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('CAIXA', 'gerenciar'))
// O relatório de recebimentos pertence às Cobranças: exige o acesso desse módulo.
const podeVerRecebimentos = computed(() => temPermissao('COBRANCAS', 'visualizar'))

const mes = useCaixaDoMes('caixa')
const acoes = useAcoesCaixa()

const modal = shallowRef<Modal>(null)
const imprimindo = shallowRef(false)

const aberto = computed(() => mes.caixa.value?.status === 'ABERTO')
const fechado = computed(() => mes.caixa.value?.status === 'FECHADO')
const pendente = computed(() => mes.situacao.value === 'PENDENTE')
const emAndamento = computed(() => mes.situacao.value === 'EM_ANDAMENTO')

// Só caixa fechado volta a abrir, e só no backend que oferece a reabertura (descoberto na primeira tentativa).
const podeReabrir = computed(() => podeGerenciar.value && fechado.value && !acoes.reaberturaIndisponivel.value)

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
  fecharModal()
  mes.aplicar(caixa)
  mostrarToast('Salvo com sucesso!')
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
  } else if (acoes.reaberturaIndisponivel.value) {
    // O servidor não tem a reabertura: avisa uma vez e o botão deixa de aparecer.
    modal.value = null
    mostrarToast('A reabertura de caixa não está disponível neste servidor.', 'info')
  }
}

/** Mesma limitação do Relatório de Frequência: o diálogo de impressão não informa se o PDF foi salvo. */
function aoConcluirImpressao() {
  imprimindo.value = false
  mostrarToast('PDF baixado!')
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
            :desabilitado="!mes.caixa.value"
            @click="imprimindo = true"
          >
            Imprimir
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
            :desabilitado="emAndamento"
            @click="modal = 'fechar'"
          >
            {{ pendente ? 'Revisar e Fechar Mês' : 'Fechar Mês' }}
          </BotaoFp>
        </div>
        <p
          v-if="podeGerenciar && emAndamento"
          class="legenda"
        >
          Disponível após o encerramento do mês.
        </p>
      </div>
    </div>

    <template v-if="mes.caixa.value">
      <CaixaResumo
        :resumo="mes.caixa.value.resumo"
        :fechado="fechado"
        :pode-alterar-inicial="podeGerenciar && aberto"
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
