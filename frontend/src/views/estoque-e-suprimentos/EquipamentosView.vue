<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import EquipamentoModalEditar from '../../components/equipamentos/EquipamentoModalEditar.vue'
import EquipamentoModalStatus from '../../components/equipamentos/EquipamentoModalStatus.vue'
import EquipamentoModalVisualizar from '../../components/equipamentos/EquipamentoModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaEquipamentos, type FiltroTipoEquipamento } from '../../composables/useListaEquipamentos'
import { useToast } from '../../composables/useToast'
import type { Equipamento } from '../../types/equipamento'
import { ROTULO_TIPO_EQUIPAMENTO, TIPOS_EQUIPAMENTO, rotuloTipoEquipamento } from '../../utils/equipamentos'
import { rotuloFornecedorVinculado } from '../../utils/fornecedores'

type Modal = { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; equipamento: Equipamento; deVisualizar: boolean } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('EQUIPAMENTOS', 'gerenciar'))

const { busca, tipo, status, pagina, porPagina, equipamentos, total, carregando, erro, carregar } = useListaEquipamentos()

const opcoesTipo: OpcaoFiltro<FiltroTipoEquipamento>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  ...TIPOS_EQUIPAMENTO.map((valor) => ({ valor, rotulo: ROTULO_TIPO_EQUIPAMENTO[valor] })),
]

const colunas: ColunaTabela[] = [
  { chave: 'codigo', rotulo: 'Código', largura: '12%' },
  { chave: 'nome', rotulo: 'Nome', largura: '27%' },
  { chave: 'tipo', rotulo: 'Tipo', largura: '12%' },
  { chave: 'marca', rotulo: 'Marca / Modelo', largura: '17%' },
  { chave: 'fornecedor', rotulo: 'Fornecedor', largura: '18%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '14%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipoModal: NonNullable<Modal>['tipo'], equipamento: Equipamento, deVisualizar = false) {
  modal.value = { tipo: tipoModal, equipamento, deVisualizar }
}

function fecharModal() {
  modal.value = null
}

/** Desistiu de editar a partir dos detalhes: volta a eles (se partiu da lista, só fecha). */
function cancelarEdicao() {
  const atual = modal.value
  if (atual?.deVisualizar) abrir('visualizar', atual.equipamento)
  else fecharModal()
}

async function aoSalvar() {
  fecharModal()
  mostrarToast('Equipamento atualizado!')
  await carregar()
}

async function aoAlterarStatus(acao: 'desativar' | 'reativar') {
  fecharModal()
  mostrarToast(acao === 'desativar' ? 'Equipamento desativado!' : 'Equipamento reativado!')
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Consultar Equipamento"
      subtitulo="Gerencie os registros dos equipamentos da empresa"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'equipamentoNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Equipamento
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="tipo"
      class="busca-lista"
      placeholder="Buscar por nome, marca ou tipo..."
      rotulo-filtro="Tipo:"
      :opcoes="opcoesTipo"
    >
      <template #filtros-extra>
        <GrupoChips
          v-model="status"
          rotulo="Status:"
          :opcoes="[
            { valor: 'TODOS', rotulo: 'Todos' },
            { valor: 'ATIVO', rotulo: 'Ativo' },
            { valor: 'INATIVO', rotulo: 'Inativo' },
          ]"
        />
      </template>
    </CardBuscaFiltro>

    <TabelaDados
      v-model:pagina="pagina"
      rotulo="Equipamentos"
      :colunas="colunas"
      :linhas="equipamentos"
      :chave-linha="(equipamento: Equipamento) => equipamento.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum equipamento encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-codigo="{ linha }">
        <span class="celula-principal">{{ linha.codigoPatrimonial }}</span>
      </template>
      <template #celula-nome="{ linha }">
        <span class="nome-linha">
          <span class="fp-celula-nome celula-bloco">{{ linha.nome }}</span>
          <SeloStatus
            v-if="linha.status === 'INATIVO'"
            :status="linha.status"
          />
        </span>
        <span
          v-if="linha.observacoes"
          class="celula-secundaria"
        >{{ linha.observacoes }}</span>
      </template>
      <template #celula-tipo="{ linha }">
        <span class="celula-principal">{{ rotuloTipoEquipamento(linha.tipo) }}</span>
      </template>
      <template #celula-marca="{ linha }">
        <span class="celula-principal">{{ linha.marca }}</span>
        <span
          v-if="linha.modelo"
          class="celula-secundaria"
        >{{ linha.modelo }}</span>
      </template>
      <template #celula-fornecedor="{ linha }">
        <span class="celula-principal">{{ rotuloFornecedorVinculado(linha.fornecedor) || '—' }}</span>
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="linha.nome"
            @click="abrir('visualizar', linha)"
          />
          <template v-if="podeGerenciar">
            <BotaoAcao
              tipo="editar"
              :alvo="linha.nome"
              @click="abrir('editar', linha)"
            />
            <BotaoAcao
              v-if="linha.status === 'ATIVO'"
              tipo="desativar"
              discreto
              :alvo="linha.nome"
              @click="abrir('desativar', linha)"
            />
            <BotaoAcao
              v-else
              tipo="reativar"
              :alvo="linha.nome"
              @click="abrir('reativar', linha)"
            />
          </template>
        </div>
      </template>
    </TabelaDados>

    <EquipamentoModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :equipamento="modal.equipamento"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.equipamento, true)"
    />
    <EquipamentoModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.equipamento.id"
      :equipamento="modal.equipamento"
      @fechar="cancelarEdicao"
      @salvo="aoSalvar"
    />
    <EquipamentoModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :equipamento="modal.equipamento"
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
  /* Mesma estrutura das demais consultas: respiro do título e folga na base. */
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

/* Com várias opções a linha de filtros não cabe ao lado da busca (telas menores): os grupos descem juntos. */
.busca-lista {
  flex-wrap: wrap;
}

.busca-lista :deep(.card-busca-campo) {
  flex: 1 1 280px;
}

.busca-lista :deep(.card-busca-filtros) {
  flex: 0 1 auto;
}

.acoes {
  display: flex;
  gap: 6px;
}

.nome-linha {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* O nome encolhe com reticências; o selo "Inativo" nunca é espremido. */
.nome-linha > :not(.celula-bloco) {
  flex-shrink: 0;
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
