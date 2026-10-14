<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import SeloTipoOrcamento from '../../components/orcamentos/SeloTipoOrcamento.vue'
import ServicoModalEditar from '../../components/servicos/ServicoModalEditar.vue'
import ServicoModalStatus from '../../components/servicos/ServicoModalStatus.vue'
import ServicoModalVisualizar from '../../components/servicos/ServicoModalVisualizar.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import SeloStatus from '../../components/ui/SeloStatus.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import { useListaServicos, type FiltroCategoriaServico } from '../../composables/useListaServicos'
import { useToast } from '../../composables/useToast'
import type { Servico } from '../../types/servico'
import { formatarMoeda } from '../../utils/formatadores'
import { ROTULO_TIPO_ORCAMENTO, rotuloUnidade } from '../../utils/orcamentos'

type Modal = { tipo: 'visualizar' | 'editar' | 'desativar' | 'reativar'; servico: Servico } | null

const router = useRouter()
const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('SERVICOS', 'gerenciar'))

const { busca, categoria, status, pagina, porPagina, servicos, total, carregando, erro, carregar } =
  useListaServicos()

// Figma: filtro "Todos | Serralheria | Construção Civil"; Calhas é a terceira categoria do sistema.
const opcoesCategoria: OpcaoFiltro<FiltroCategoriaServico>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'SERRALHERIA', rotulo: ROTULO_TIPO_ORCAMENTO.SERRALHERIA },
  { valor: 'CONSTRUCAO_CIVIL', rotulo: ROTULO_TIPO_ORCAMENTO.CONSTRUCAO_CIVIL },
  { valor: 'CALHAS', rotulo: ROTULO_TIPO_ORCAMENTO.CALHAS },
]

const colunas: ColunaTabela[] = [
  { chave: 'categoria', rotulo: 'Categoria', largura: '17%' },
  { chave: 'nome', rotulo: 'Nome do Serviço', largura: '37%' },
  { chave: 'valor', rotulo: 'Valor Unitário', largura: '15%' },
  { chave: 'unidade', rotulo: 'Unidade de Medida', largura: '17%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '14%' },
]

const modal = shallowRef<Modal>(null)

function abrir(tipoModal: NonNullable<Modal>['tipo'], servico: Servico) {
  modal.value = { tipo: tipoModal, servico }
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
      titulo="Consultar Serviço"
      subtitulo="Gerencie os serviços oferecidos e os valores usados como base nos orçamentos"
    >
      <template
        v-if="podeGerenciar"
        #acao
      >
        <BotaoFp
          tamanho="pagina"
          @click="router.push({ name: 'servicoNovo' })"
        >
          <template #icone>
            <img
              :src="maisIcon"
              alt=""
              width="16"
              height="16"
            >
          </template>
          Novo Serviço
        </BotaoFp>
      </template>
    </CabecalhoPagina>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="categoria"
      placeholder="Buscar por nome ou descrição do serviço..."
      rotulo-filtro="Categoria:"
      :opcoes="opcoesCategoria"
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
      rotulo="Serviços"
      :colunas="colunas"
      :linhas="servicos"
      :chave-linha="(servico: Servico) => servico.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum serviço encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-categoria="{ linha }">
        <SeloTipoOrcamento :tipo="linha.categoria" />
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
          v-if="linha.descricao"
          class="celula-secundaria"
        >{{ linha.descricao }}</span>
      </template>
      <template #celula-valor="{ linha }">
        <span class="celula-principal">{{ formatarMoeda(linha.valorReferencia) }}</span>
      </template>
      <template #celula-unidade="{ linha }">
        <span class="celula-principal">{{ rotuloUnidade(linha.unidadeMedida) }}</span>
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

    <ServicoModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :servico="modal.servico"
      :pode-editar="podeGerenciar"
      @fechar="fecharModal"
      @editar="abrir('editar', modal.servico)"
    />
    <ServicoModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.servico.id"
      :servico="modal.servico"
      @fechar="fecharModal"
      @salvo="aoSalvar"
    />
    <ServicoModalStatus
      v-else-if="modal?.tipo === 'desativar' || modal?.tipo === 'reativar'"
      :servico="modal.servico"
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

/* Valor principal (13px #333) e descrição abaixo (11px #999), como no Figma. */
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
