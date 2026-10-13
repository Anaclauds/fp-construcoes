<script setup lang="ts">
import BotaoAcao from '../ui/BotaoAcao.vue'
import ControleStatusFrequencia from '../ui/ControleStatusFrequencia.vue'
import TabelaDados, { type ColunaTabela } from '../ui/TabelaDados.vue'
import type { StatusFrequencia } from '../../types'
import { rotuloLegivel } from '../../utils/formatadores'
import type { LinhaFolha } from '../../utils/frequencia'

const props = defineProps<{
  linhas: LinhaFolha[]
  /** true: status editáveis (Gerenciar Frequência); false: só leitura (Consultar Frequência). */
  editavel: boolean
  /** Usuário pode alterar observações e status (permissão de gerenciar). */
  podeGerenciar: boolean
  carregando?: boolean
  erro?: string | null
  textoVazio?: string
  /** Funcionários com observação obrigatória e ainda vazia (linha destacada). */
  pendentes?: ReadonlySet<number>
}>()

const emit = defineEmits<{
  'alterar-status': [funcionarioId: number, status: StatusFrequencia]
  visualizar: [linha: LinhaFolha]
  'editar-observacao': [linha: LinhaFolha]
  'tentar-novamente': []
}>()

const colunas: ColunaTabela[] = [
  { chave: 'funcionario', rotulo: 'Funcionário', largura: '22%' },
  { chave: 'status', rotulo: 'Status', largura: '45%' },
  { chave: 'observacao', rotulo: 'Observação', largura: '21%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '12%' },
]

function ehPendente(linha: LinhaFolha): boolean {
  return props.pendentes?.has(linha.funcionarioId) ?? false
}

/**
 * Editar observação: na edição vale para qualquer linha com status escolhido (o texto vai no salvar);
 * na consulta só existe se já há registro, pois a API altera a observação de um registro existente.
 */
function podeEditarObservacao(linha: LinhaFolha): boolean {
  if (!props.podeGerenciar) return false
  return props.editavel ? linha.status !== null : linha.id !== null
}

function dicaObservacao(linha: LinhaFolha): string {
  return props.editavel && linha.status === null ? 'Escolha um status primeiro' : 'Editar observação'
}
</script>

<template>
  <TabelaDados
    rotulo="Folha de frequência"
    :colunas="colunas"
    :linhas="linhas"
    :chave-linha="(linha: LinhaFolha) => linha.funcionarioId"
    :total="linhas.length"
    :carregando="carregando"
    :erro="erro"
    :texto-vazio="textoVazio ?? 'Nenhum funcionário ativo encontrado.'"
    :classe-linha="(linha: LinhaFolha) => (ehPendente(linha) ? 'fp-linha-pendente' : undefined)"
    @tentar-novamente="emit('tentar-novamente')"
  >
    <template #celula-funcionario="{ linha }">
      <span class="fp-celula-nome folha-bloco">{{ linha.nome }}</span>
      <span class="folha-secundaria">{{ linha.apelido ? `${linha.apelido} | ${rotuloLegivel(linha.funcao)}` : rotuloLegivel(linha.funcao) }}</span>
    </template>

    <template #celula-status="{ linha }">
      <ControleStatusFrequencia
        :model-value="linha.status"
        :alvo="linha.nome"
        :somente-leitura="!editavel"
        @update:model-value="(status) => status && emit('alterar-status', linha.funcionarioId, status)"
      />
    </template>

    <template #celula-observacao="{ linha }">
      <span
        v-if="ehPendente(linha)"
        class="folha-pendente"
        :title="`${linha.nome}: observação obrigatória para este status`"
      >Observação obrigatória</span>
      <span
        v-else
        class="folha-observacao"
        :class="{ 'folha-observacao--vazia': !linha.observacao }"
        :title="linha.observacao || undefined"
      >{{ linha.observacao || '—' }}</span>
    </template>

    <template #celula-acoes="{ linha }">
      <div class="folha-acoes">
        <BotaoAcao
          tipo="visualizar"
          :alvo="linha.nome"
          @click="emit('visualizar', linha)"
        />
        <BotaoAcao
          v-if="podeEditarObservacao(linha) || (editavel && podeGerenciar)"
          tipo="editar"
          class="folha-botao-obs"
          :class="{ 'folha-botao-obs--pendente': ehPendente(linha) }"
          :alvo="`observação de ${linha.nome}`"
          :title="dicaObservacao(linha)"
          :disabled="!podeEditarObservacao(linha)"
          :data-obs-funcionario="linha.funcionarioId"
          @click="emit('editar-observacao', linha)"
        />
      </div>
    </template>

    <template #rodape>
      <slot name="rodape" />
    </template>
  </TabelaDados>
</template>

<style scoped>
.folha-bloco {
  display: block;
}

.folha-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folha-observacao {
  color: #333;
  font-size: 13px;
}

.folha-observacao--vazia {
  color: var(--fp-cinza-rotulo);
}

.folha-pendente {
  color: #b45309;
  font-size: 12px;
  font-weight: 600;
}

.folha-acoes {
  display: flex;
  gap: 6px;
}

/* O lápis é o BotaoAcao "editar"; aqui só os estados de bloqueado e de justificativa pendente. */
.folha-botao-obs:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.folha-botao-obs--pendente {
  border-color: #d97706;
  background-color: #fffbeb;
}
</style>
