<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import CobrancaCartao from '../../components/cobrancas/CobrancaCartao.vue'
import CobrancaModalDetalhes from '../../components/cobrancas/CobrancaModalDetalhes.vue'
import CobrancaModalRecebimento from '../../components/cobrancas/CobrancaModalRecebimento.vue'
import CobrancaProjetoCabecalho from '../../components/cobrancas/CobrancaProjetoCabecalho.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import ModalConfirmacao from '../../components/ui/ModalConfirmacao.vue'
import LinkVoltar from '../../components/ui/LinkVoltar.vue'
import { useAuth } from '../../composables/useAuth'
import { useProjetoCobrancas } from '../../composables/useProjetoCobrancas'
import { useToast } from '../../composables/useToast'
import { extrairErro } from '../../services/api'
import { cancelamentoDeCobrancaDisponivel, cancelarCobranca } from '../../services/cobrancas.service'
import { descricaoCobranca, mensagemCobranca } from '../../utils/cobrancas'

type Modal = { tipo: 'detalhes' | 'recebimento'; cobrancaId: number } | null

const route = useRoute()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('COBRANCAS', 'gerenciar'))

const projetoId = computed(() => Number(route.params.projetoId))
const { projeto, carregando, erro, naoEncontrado, carregar } = useProjetoCobrancas(projetoId)

const modal = shallowRef<Modal>(null)

// A cobrança do modal vem sempre da versão mais recente do projeto (recarregada após cada recebimento).
const cobrancaDoModal = computed(
  () => projeto.value?.cobrancas.find((cobranca) => cobranca.id === modal.value?.cobrancaId) ?? null,
)

watch(
  projetoId,
  () => {
    modal.value = null
    void carregar()
  },
  { immediate: true },
)

function abrir(tipo: 'detalhes' | 'recebimento', cobrancaId: number) {
  modal.value = { tipo, cobrancaId }
}

function fecharModal() {
  modal.value = null
}

/** Cobrança que o usuário está prestes a cancelar (confirmação em modal). */
const cancelando = shallowRef<number | null>(null)
const cancelandoEnviando = shallowRef(false)
const erroCancelar = shallowRef<string | null>(null)

const cobrancaACancelar = computed(
  () => projeto.value?.cobrancas.find((cobranca) => cobranca.id === cancelando.value) ?? null,
)

function pedirCancelar(cobrancaId: number) {
  erroCancelar.value = null
  cancelando.value = cobrancaId
}

async function confirmarCancelar() {
  if (cancelando.value === null || cancelandoEnviando.value) return
  cancelandoEnviando.value = true
  erroCancelar.value = null
  try {
    await cancelarCobranca(cancelando.value)
    cancelando.value = null
    mostrarToast('Cobrança cancelada.')
    await carregar()
  } catch (e) {
    const { mensagem, status } = extrairErro(e)
    // Rota ausente: o botão já some (flag do serviço); mensagem clara em vez do 404 técnico.
    erroCancelar.value =
      status === 404 && !cancelamentoDeCobrancaDisponivel.value
        ? 'O cancelamento de cobranças ainda não está disponível neste servidor.'
        : mensagemCobranca(mensagem)
    // Já cancelada, com recebimento ou removida: a tela está desatualizada.
    if (status === 409 || status === 400 || status === 404) await carregar()
  } finally {
    cancelandoEnviando.value = false
  }
}

async function aoRegistrar() {
  fecharModal()
  mostrarToast('Recebimento registrado!')
  await carregar()
}
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Gerenciar Cobrança"
      subtitulo="Acompanhe e registre os recebimentos deste projeto"
    />

    <LinkVoltar
      class="voltar"
      :para="{ name: 'cobrancas' }"
      voltar-no-historico
    />

    <p
      v-if="carregando && !projeto"
      class="estado"
      role="status"
    >
      Carregando cobranças...
    </p>

    <div
      v-else-if="erro"
      class="estado estado--erro"
      role="alert"
    >
      <p>{{ erro }}</p>
      <BotaoFp
        variante="secundario"
        tamanho="pagina"
        @click="carregar"
      >
        Tentar novamente
      </BotaoFp>
    </div>

    <div
      v-else-if="naoEncontrado || (projeto && projeto.cobrancas.length === 0)"
      class="estado"
      role="status"
    >
      <p class="estado-titulo">
        Este projeto não possui cobranças.
      </p>
      <p>As cobranças surgem quando o projeto é iniciado (ou, na construção civil, quando uma etapa é registrada).</p>
    </div>

    <template v-else-if="projeto">
      <CobrancaProjetoCabecalho :projeto="projeto" />

      <div
        class="cobrancas"
        :aria-busy="carregando"
      >
        <CobrancaCartao
          v-for="cobranca in projeto.cobrancas"
          :key="cobranca.id"
          :cobranca="cobranca"
          :pode-gerenciar="podeGerenciar"
          @detalhes="abrir('detalhes', cobranca.id)"
          @receber="abrir('recebimento', cobranca.id)"
          @cancelar="pedirCancelar(cobranca.id)"
        />
      </div>
    </template>

    <ModalConfirmacao
      v-if="cobrancaACancelar"
      aberto
      titulo="Cancelar cobrança"
      :subtitulo="descricaoCobranca(cobrancaACancelar.descricao)"
      texto-confirmar="Cancelar cobrança"
      texto-cancelar="Voltar"
      titulo-aviso="Atenção"
      pergunta="Deseja cancelar esta cobrança?"
      :carregando="cancelandoEnviando"
      :erro="erroCancelar"
      @confirmar="confirmarCancelar"
      @fechar="cancelando = null"
    >
      A cobrança e todas as suas parcelas serão canceladas. Só é possível cancelar cobranças sem recebimentos registrados, e a ação não pode ser desfeita.
    </ModalConfirmacao>

    <CobrancaModalDetalhes
      v-if="modal?.tipo === 'detalhes' && cobrancaDoModal"
      :key="cobrancaDoModal.id"
      :cobranca="cobrancaDoModal"
      @fechar="fecharModal"
    />
    <CobrancaModalRecebimento
      v-else-if="modal?.tipo === 'recebimento' && cobrancaDoModal && podeGerenciar"
      :key="cobrancaDoModal.id"
      :cobranca="cobrancaDoModal"
      @fechar="fecharModal"
      @registrado="aoRegistrar"
      @desatualizado="carregar"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 6px;
}

.voltar {
  align-self: flex-start;
}

.cobrancas {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.estado {
  padding: 32px 24px;
  border: 1.3px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);

  color: #6a7282;
  font-size: 14px;
  text-align: center;
}

.estado p {
  margin: 0;
}

.estado-titulo {
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.estado--erro {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--fp-vermelho-escuro);
}
</style>
