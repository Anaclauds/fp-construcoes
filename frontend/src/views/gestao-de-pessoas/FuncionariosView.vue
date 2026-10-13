<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import FuncionarioModalEditar from '../../components/funcionarios/FuncionarioModalEditar.vue'
import FuncionarioModalStatus from '../../components/funcionarios/FuncionarioModalStatus.vue'
import FuncionarioModalVisualizar from '../../components/funcionarios/FuncionarioModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro from '../../components/ui/CardBuscaFiltro.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaFuncionarios } from '../../composables/useListaFuncionarios'
import { useToast } from '../../composables/useToast'
import type { Funcionario } from '../../types'
import { formatarTelefone, rotuloLegivel } from '../../utils/formatadores'

type Modal =
  | { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; funcionario: Funcionario }
  | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('GESTAO_FUNCIONARIOS', 'gerenciar'))

const { busca, status, pagina, porPagina, funcionarios, total, carregando, erro, carregar } =
  useListaFuncionarios()

const colunas: ColunaTabela[] = [
  { chave: 'nome', rotulo: 'Nome', largura: '28%' },
  { chave: 'celular', rotulo: 'Celular', largura: '20%' },
  { chave: 'funcao', rotulo: 'Função', largura: '22%' },
  { chave: 'status', rotulo: 'Status', largura: '14%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '16%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipo: NonNullable<Modal>['tipo'], funcionario: Funcionario) {
  modal.value = { tipo, funcionario }
}

function fecharModal() {
  modal.value = null
}

async function aoSalvar() {
  fecharModal()
  mostrarToast('Salvo com sucesso!')
  await carregar()
}

async function aoAlterarStatus(acao: 'desativar' | 'reativar') {
  fecharModal()
  mostrarToast(acao === 'desativar' ? 'Desativado com sucesso!' : 'Ativado com sucesso!')
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Funcionário"
      subtitulo="Gerencie os registros dos funcionários da empresa"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'funcionarioNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Funcionário
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="status"
      placeholder="Buscar por nome, apelido, função, CPF ou celular..."
    />

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Funcionários"
      :colunas="colunas"
      :linhas="funcionarios"
      :chave-linha="(funcionario: Funcionario) => funcionario.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum funcionário encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-nome="{ linha }">
        <span class="fp-celula-nome celula-bloco">{{ linha.nomeCompleto }}</span>
        <span
          v-if="linha.apelido"
          class="celula-secundaria"
        >{{ linha.apelido }}</span>
      </template>
      <template #celula-celular="{ linha }">
        <span class="celula-principal">{{ formatarTelefone(linha.celular) }}</span>
      </template>
      <template #celula-funcao="{ linha }">
        <span class="celula-principal">{{ rotuloLegivel(linha.funcao) }}</span>
        <span class="celula-secundaria">{{ rotuloLegivel(linha.setorAtuacao) }}</span>
      </template>
      <template #celula-status="{ linha }">
        <SeloStatus :status="linha.status" />
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.nomeCompleto"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="linha.nomeCompleto"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              discreto
              :alvo="linha.nomeCompleto"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.nomeCompleto"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <FuncionarioModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :funcionario="modal.funcionario"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.funcionario)"
    />
    <FuncionarioModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.funcionario.id"
      :funcionario="modal.funcionario"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <FuncionarioModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :funcionario="modal.funcionario"
      :acao="modal.tipo"
      @fechar="fecharModal"
      @concluido="aoAlterarStatus"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 28px;
  /* Figma: o título ganha respiro até o card de busca e a tabela termina ~60px acima da borda. */
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

.acoes {
  display: flex;
  gap: 6px;
}

.celula-bloco {
  display: block;
}

/* Valor principal (13px #333) e linha de apoio abaixo (11px #999), como no Figma. */
.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}
</style>
