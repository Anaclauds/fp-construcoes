<script setup lang="ts">
import { nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useImpressao } from '../../composables/useImpressao'
import { buscarCliente } from '../../services/clientes.service'
import type { Orcamento } from '../../types'
import { formatarDataHora } from '../../utils/datas'
import { enderecoEmUmaLinha, nomeArquivoOrcamento } from '../../utils/orcamentos'
import OrcamentoDocumento from './OrcamentoDocumento.vue'

/**
 * Gera o PDF do orçamento sem biblioteca: monta a folha A4 fora do #app (`.fp-area-impressao`, invisível
 * na tela) e abre a impressão do navegador, onde o usuário escolhe "Salvar como PDF". O nome sugerido do
 * arquivo vem do título da aba (`Orcamento-0001-Cliente`). Monte com `v-if`; `concluido` avisa que o
 * diálogo fechou (o navegador não diz se salvou ou cancelou, então o aviso ao usuário é neutro).
 */
const props = defineProps<{ orcamento: Orcamento }>()

const emit = defineEmits<{ concluido: [] }>()

const { usuario, temPermissao } = useAuth()
const { imprimir } = useImpressao()

const area = useTemplateRef<HTMLElement>('area')
const endereco = shallowRef<string | null>(null)
// Fixado ao pedir o PDF: a data/hora do papel não muda enquanto o diálogo está aberto.
const emitidoEm = formatarDataHora()
const emitidoPor = usuario.value?.nomeCompleto ?? 'Usuário'

onMounted(async () => {
  // O endereço do cliente exige acesso ao módulo Clientes; sem ele o PDF usa cidade/UF do orçamento.
  try {
    if (temPermissao('CLIENTES', 'visualizar')) {
      const cliente = await buscarCliente(props.orcamento.clienteId)
      endereco.value = enderecoEmUmaLinha(cliente) || null
    }
  } catch {
    endereco.value = null
  }

  await nextTick()
  // Espera o logo carregar: imprimir antes dele sair em branco.
  const imagens = Array.from(area.value?.querySelectorAll('img') ?? [])
  await Promise.all(imagens.map((imagem) => imagem.decode().catch(() => undefined)))

  imprimir(nomeArquivoOrcamento(props.orcamento), () => emit('concluido'))
})
</script>

<template>
  <!-- Fora do #app (que some no @media print) e invisível na tela. -->
  <Teleport to="body">
    <div
      ref="area"
      class="fp-area-impressao"
    >
      <OrcamentoDocumento
        :orcamento="orcamento"
        :endereco-cliente="endereco"
        :emitido-em="emitidoEm"
        :emitido-por="emitidoPor"
      />
    </div>
  </Teleport>
</template>
