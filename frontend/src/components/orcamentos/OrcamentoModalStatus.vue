<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { extrairErro } from '../../services/api'
import { alterarStatusOrcamento } from '../../services/orcamentos.service'
import type { Orcamento, StatusDefinivel } from '../../types'
import { formatarNumeroOrcamento, mensagemOrcamento } from '../../utils/orcamentos'
import ModalConfirmacao from '../ui/ModalConfirmacao.vue'

const props = defineProps<{
  orcamento: Orcamento
  destino: StatusDefinivel
}>()

const emit = defineEmits<{
  fechar: []
  /** A API já foi chamada com sucesso; quem usa mostra o toast e recarrega a lista. */
  concluido: [orcamento: Orcamento]
}>()

const processando = shallowRef(false)
const erro = shallowRef<string | null>(null)

interface Texto {
  titulo: string
  confirmar: string
  perigo: boolean
}

const TEXTOS: Record<StatusDefinivel, Texto> = {
  PENDENTE: { titulo: 'Voltar para Pendente', confirmar: 'Sim, continuar', perigo: false },
  EM_ANALISE: { titulo: 'Marcar como Em Análise', confirmar: 'Sim, continuar', perigo: false },
  REPROVADO: { titulo: 'Reprovar Orçamento', confirmar: 'Confirmar Reprovação', perigo: true },
  CANCELADO: { titulo: 'Cancelar Orçamento', confirmar: 'Confirmar Cancelamento', perigo: true },
}

const texto = computed(() => TEXTOS[props.destino])
const identificacao = computed(() => `${formatarNumeroOrcamento(props.orcamento.numero)} · ${props.orcamento.titulo}`)

async function confirmar() {
  processando.value = true
  erro.value = null
  try {
    const atualizado = await alterarStatusOrcamento(props.orcamento.id, props.destino)
    emit('concluido', atualizado)
  } catch (e) {
    erro.value = mensagemOrcamento(extrairErro(e).mensagem)
  } finally {
    processando.value = false
  }
}
</script>

<template>
  <ModalConfirmacao
    aberto
    :titulo="texto.titulo"
    titulo-aviso="Atenção"
    :variante="texto.perigo ? 'perigo' : 'sucesso'"
    :texto-confirmar="texto.confirmar"
    texto-cancelar="Voltar"
    :carregando="processando"
    :erro="erro"
    @confirmar="confirmar"
    @fechar="emit('fechar')"
  >
    <template v-if="destino === 'PENDENTE'">
      O orçamento <strong>{{ identificacao }}</strong> voltará para <strong>Pendente</strong>, aguardando retorno do cliente.
    </template>
    <template v-else-if="destino === 'EM_ANALISE'">
      O orçamento <strong>{{ identificacao }}</strong> será marcado como <strong>Em Análise</strong>.
    </template>
    <template v-else-if="destino === 'REPROVADO'">
      O orçamento <strong>{{ identificacao }}</strong> será marcado como <strong>Reprovado</strong> (não aprovado pelo
      cliente). Ele continua na lista e ainda pode ser aprovado depois.
    </template>
    <template v-else>
      O orçamento <strong>{{ identificacao }}</strong> será <strong>cancelado</strong>. Orçamentos cancelados não podem
      mais ser editados, alterados nem aprovados.
    </template>
  </ModalConfirmacao>
</template>
