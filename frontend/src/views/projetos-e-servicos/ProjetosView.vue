<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import ProjetoMenuAcoes from '../../components/projetos/ProjetoMenuAcoes.vue'
import ProjetoModalCancelarRegistro from '../../components/projetos/ProjetoModalCancelarRegistro.vue'
import ProjetoModalEditar from '../../components/projetos/ProjetoModalEditar.vue'
import ProjetoModalEditarRegistro from '../../components/projetos/ProjetoModalEditarRegistro.vue'
import ProjetoModalEtapa from '../../components/projetos/ProjetoModalEtapa.vue'
import ProjetoModalExtra from '../../components/projetos/ProjetoModalExtra.vue'
import ProjetoModalIniciar from '../../components/projetos/ProjetoModalIniciar.vue'
import ProjetoModalStatus from '../../components/projetos/ProjetoModalStatus.vue'
import ProjetoModalVisualizar from '../../components/projetos/ProjetoModalVisualizar.vue'
import SeloStatusProjeto from '../../components/projetos/SeloStatusProjeto.vue'
import SeloTipoOrcamento from '../../components/orcamentos/SeloTipoOrcamento.vue'
import BotaoAcao from '../../components/ui/BotaoAcao.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CardBuscaFiltro, { type OpcaoFiltro } from '../../components/ui/CardBuscaFiltro.vue'
import CardIndicador from '../../components/ui/CardIndicador.vue'
import GrupoChips from '../../components/ui/GrupoChips.vue'
import type { ItemMenuAcao } from '../../components/ui/MenuMaisAcoes.vue'
import TabelaDados, { type ColunaTabela } from '../../components/ui/TabelaDados.vue'
import { useAuth } from '../../composables/useAuth'
import {
  useListaProjetos,
  type FiltroStatusProjeto,
  type FiltroTipoProjeto,
} from '../../composables/useListaProjetos'
import { useToast } from '../../composables/useToast'
import type { ProjetoDetalhe, ProjetoResumo, RegistroEditavel, RespostaProjeto, StatusFinalProjeto } from '../../types/projeto'
import { formatarMoeda } from '../../utils/formatadores'
import { formatarNumeroOrcamento } from '../../utils/orcamentos'
import { avisosDoStatus } from '../../utils/projetos'

type TipoModal = 'visualizar' | 'iniciar' | 'etapa' | 'extra' | 'status' | 'editar' | 'editarRegistro' | 'cancelarRegistro'
interface Modal {
  tipo: TipoModal
  projeto: ProjetoResumo
  /** A ação partiu do modal de detalhes: desistir dela volta para ele. */
  deVisualizar: boolean
  /** Etapa ou extra em edição ou cancelamento (`tipo: 'editarRegistro'` ou `'cancelarRegistro'`). */
  registro?: RegistroEditavel
  /** Detalhe devolvido pela ação que reabriu os detalhes (evita um GET repetido). */
  detalhe?: ProjetoDetalhe
}

const { temPermissao } = useAuth()
const { mostrarToast } = useToast()

const podeGerenciar = computed(() => temPermissao('PROJETOS', 'gerenciar'))

const { busca, status, tipo, pagina, porPagina, projetos, total, indicadores, carregando, erro, carregar } = useListaProjetos()

// Os cartões acompanham a busca e o tipo (não o status): com algum deles ativo, o texto deixa claro que não é o total geral.
const recortado = computed(() => busca.value.trim() !== '' || tipo.value !== 'TODOS')
const descricaoTotal = computed(() => (recortado.value ? 'na busca atual' : 'cadastrados'))

// Figma (GERENCIAR PROJETO 2): Todos | Em Execução | Planejado | Concluído | Cancelado.
const opcoesStatus: OpcaoFiltro<FiltroStatusProjeto>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'EM_EXECUCAO', rotulo: 'Em Execução' },
  { valor: 'PLANEJADO', rotulo: 'Planejado' },
  { valor: 'CONCLUIDO', rotulo: 'Concluído' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
]

const opcoesTipo: OpcaoFiltro<FiltroTipoProjeto>[] = [
  { valor: 'TODOS', rotulo: 'Todos' },
  { valor: 'SERRALHERIA', rotulo: 'Serralheria' },
  { valor: 'CALHAS', rotulo: 'Calhas' },
  { valor: 'CONSTRUCAO_CIVIL', rotulo: 'Construção Civil' },
]

const colunas: ColunaTabela[] = [
  { chave: 'numero', rotulo: 'Nº', largura: '9%' },
  { chave: 'titulo', rotulo: 'Título / Tipo', largura: '27%' },
  { chave: 'cliente', rotulo: 'Cliente', largura: '22%' },
  { chave: 'valor', rotulo: 'Valor Total', largura: '13%', numerica: true },
  { chave: 'status', rotulo: 'Status', largura: '16%' },
  { chave: 'acoes', rotulo: 'Ações', largura: '120px' },
]

const modal = shallowRef<Modal | null>(null)
/** "Registros da obra" aberto nos detalhes: vive aqui porque o modal é recriado depois de cada ação. */
const registrosAbertos = shallowRef(false)

function abrir(tipoModal: TipoModal, projeto: ProjetoResumo, deVisualizar = false, registro?: RegistroEditavel) {
  modal.value = { tipo: tipoModal, projeto, deVisualizar, registro }
}

/** Abre os detalhes a partir da lista: a seção "Registros da obra" começa fechada. */
function abrirDetalhes(projeto: ProjetoResumo) {
  registrosAbertos.value = false
  abrir('visualizar', projeto)
}

function fecharModal() {
  modal.value = null
}

/** Desistiu da ação: volta aos detalhes do projeto de onde ela partiu (ou fecha, se partiu da lista). */
function cancelarAcao() {
  const atual = modal.value
  if (atual?.deVisualizar) abrir('visualizar', atual.projeto)
  else fecharModal()
}

function aoAlterarStatus(destino: StatusFinalProjeto, resposta: RespostaProjeto) {
  void aoConcluirAcao(destino === 'CONCLUIDO' ? 'Projeto concluído!' : 'Projeto cancelado!', resposta, avisosDoStatus(resposta))
}

/**
 * Ação gravada com sucesso (iniciar, etapa, extra, status, editar projeto/etapa/extra, cancelar etapa/extra): atualiza a
 * lista e, se partiu dos detalhes, volta a eles já com os dados novos (o resumo da linha é refeito com a resposta, para o
 * cabeçalho do detalhe não ficar velho). Com avisos do servidor, um único toast os traz dentro, em vez de dois empilhados.
 */
async function aoConcluirAcao(mensagem: string, resposta: ProjetoDetalhe, avisos: string[] = []) {
  const atual = modal.value
  if (atual?.deVisualizar) {
    const { etapas, extras } = resposta
    abrir('visualizar', { ...atual.projeto, ...resposta, _count: { etapas: etapas.length, extras: extras.length } })
    if (modal.value) modal.value = { ...modal.value, detalhe: resposta }
  } else fecharModal()
  mostrarToast(mensagem, avisos.length > 0 ? 'info' : 'sucesso', avisos.length > 0 ? 12000 : undefined, avisos)
  await carregar()
}

const rotuloProjeto = (projeto: ProjetoResumo) => `projeto ${formatarNumeroOrcamento(projeto.orcamento.numero)}`

/**
 * Ações da linha (menu "⋯"). Projeto planejado pode ser editado ou cancelado; em execução, também etapa
 * (só Construção Civil), extra e status.
 */
function itensMenu(projeto: ProjetoResumo): ItemMenuAcao[] {
  const editar: ItemMenuAcao[] = [{ valor: 'editar', rotulo: 'Editar projeto' }]
  if (projeto.status === 'PLANEJADO') return [...editar, { valor: 'status', rotulo: 'Cancelar projeto', perigo: true }]
  const itens: ItemMenuAcao[] = [...editar]
  if (projeto.orcamento.tipo === 'CONSTRUCAO_CIVIL') itens.push({ valor: 'etapa', rotulo: 'Registrar etapa' })
  itens.push({ valor: 'extra', rotulo: 'Registrar extra' }, { valor: 'status', rotulo: 'Atualizar status' })
  return itens
}

function aoEscolherNoMenu(projeto: ProjetoResumo, valor: string) {
  abrir(valor as 'editar' | 'etapa' | 'extra' | 'status', projeto)
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Gerenciar Projeto"
      subtitulo="Gerencie todos os projetos e serviços da empresa"
    />

    <section
      class="indicadores"
      aria-label="Indicadores de projetos"
    >
      <CardIndicador
        titulo="Total de Projetos"
        :valor="indicadores?.totalProjetos ?? '—'"
        :descricao="descricaoTotal"
      />
      <CardIndicador
        titulo="Planejado"
        :valor="indicadores?.planejados ?? '—'"
        descricao="ainda não iniciados"
        classe-cor="fp-status--falta-justificada"
      />
      <CardIndicador
        titulo="Em Execução"
        :valor="indicadores?.emExecucao ?? '—'"
        descricao="projetos ativos"
        classe-cor="fp-status--meio-periodo"
      />
      <CardIndicador
        titulo="Concluídos"
        :valor="indicadores?.concluidos ?? '—'"
        descricao="finalizados"
        classe-cor="fp-status--presente"
      />
    </section>

    <CardBuscaFiltro
      v-model:busca="busca"
      v-model:status="status"
      class="busca-projetos"
      placeholder="Buscar por título, número ou cliente..."
      rotulo-filtro="Status:"
      :opcoes="opcoesStatus"
    >
      <template #filtros-extra>
        <GrupoChips
          v-model="tipo"
          rotulo="Tipo:"
          :opcoes="opcoesTipo"
        />
      </template>
    </CardBuscaFiltro>

    <TabelaDados
      v-model:pagina="pagina"
      class="tabela-projetos"
      rotulo="Projetos"
      :colunas="colunas"
      :linhas="projetos"
      :chave-linha="(projeto: ProjetoResumo) => projeto.id"
      :total="total"
      :por-pagina="porPagina"
      :carregando="carregando"
      :erro="erro"
      texto-vazio="Nenhum projeto encontrado."
      @tentar-novamente="carregar"
    >
      <template #celula-numero="{ linha }">
        <span class="celula-principal celula-numero">{{ formatarNumeroOrcamento(linha.orcamento.numero) }}</span>
      </template>
      <template #celula-titulo="{ linha }">
        <span
          class="fp-celula-nome celula-bloco celula-corte"
          :title="linha.orcamento.titulo"
        >{{ linha.orcamento.titulo }}</span>
        <SeloTipoOrcamento :tipo="linha.orcamento.tipo" />
      </template>
      <template #celula-cliente="{ linha }">
        <span class="celula-principal celula-corte">{{ linha.orcamento.cliente.nome }}</span>
        <span class="celula-secundaria">Resp: {{ linha.responsavel.nomeCompleto }}</span>
      </template>
      <template #celula-valor="{ linha }">
        <span class="celula-principal celula-valor">{{ formatarMoeda(linha.orcamento.valorTotal) }}</span>
      </template>
      <template #celula-status="{ linha }">
        <SeloStatusProjeto :status="linha.status" />
      </template>
      <template #celula-acoes="{ linha }">
        <div class="acoes">
          <BotaoAcao
            tipo="visualizar"
            :alvo="rotuloProjeto(linha)"
            @click="abrirDetalhes(linha)"
          />
          <BotaoAcao
            v-if="podeGerenciar && linha.status === 'PLANEJADO'"
            tipo="iniciar"
            :alvo="rotuloProjeto(linha)"
            @click="abrir('iniciar', linha)"
          />
          <ProjetoMenuAcoes
            v-if="podeGerenciar && (linha.status === 'EM_EXECUCAO' || linha.status === 'PLANEJADO') && itensMenu(linha).length > 0"
            :itens="itensMenu(linha)"
            :alvo="rotuloProjeto(linha)"
            @escolher="aoEscolherNoMenu(linha, $event)"
          />
        </div>
      </template>
    </TabelaDados>

    <ProjetoModalVisualizar
      v-if="modal?.tipo === 'visualizar'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      :pode-gerenciar="podeGerenciar"
      :detalhe-inicial="modal.detalhe"
      :registros-abertos="registrosAbertos"
      @registros-abertos="registrosAbertos = $event"
      @fechar="fecharModal"
      @iniciar="abrir('iniciar', modal.projeto, true)"
      @etapa="abrir('etapa', modal.projeto, true)"
      @extra="abrir('extra', modal.projeto, true)"
      @status="abrir('status', modal.projeto, true)"
      @editar="abrir('editar', modal.projeto, true)"
      @editar-registro="abrir('editarRegistro', modal.projeto, true, $event)"
      @cancelar-registro="abrir('cancelarRegistro', modal.projeto, true, $event)"
    />
    <ProjetoModalEditar
      v-else-if="modal?.tipo === 'editar'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      @fechar="cancelarAcao"
      @salvo="aoConcluirAcao('Projeto atualizado!', $event)"
      @desatualizado="carregar"
    />
    <ProjetoModalEditarRegistro
      v-else-if="modal?.tipo === 'editarRegistro' && modal.registro"
      :key="`${modal.registro.tipo}-${modal.registro.id}`"
      :projeto-id="modal.projeto.id"
      :registro="modal.registro"
      @fechar="cancelarAcao"
      @salvo="aoConcluirAcao(modal.registro.tipo === 'etapa' ? 'Etapa atualizada!' : 'Extra atualizado!', $event)"
      @desatualizado="carregar"
    />
    <ProjetoModalCancelarRegistro
      v-else-if="modal?.tipo === 'cancelarRegistro' && modal.registro"
      :key="`cancelar-${modal.registro.tipo}-${modal.registro.id}`"
      :projeto-id="modal.projeto.id"
      :registro="modal.registro"
      @fechar="cancelarAcao"
      @cancelado="aoConcluirAcao(modal.registro.tipo === 'etapa' ? 'Etapa cancelada!' : 'Extra cancelado!', $event)"
      @desatualizado="carregar"
    />
    <ProjetoModalIniciar
      v-else-if="modal?.tipo === 'iniciar'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      @fechar="cancelarAcao"
      @iniciado="aoConcluirAcao"
      @desatualizado="carregar"
    />
    <ProjetoModalEtapa
      v-else-if="modal?.tipo === 'etapa'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      @fechar="cancelarAcao"
      @registrado="aoConcluirAcao('Etapa registrada e cobrança gerada!', $event)"
      @desatualizado="carregar"
    />
    <ProjetoModalExtra
      v-else-if="modal?.tipo === 'extra'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      @fechar="cancelarAcao"
      @registrado="aoConcluirAcao('Extra cadastrado!', $event)"
      @desatualizado="carregar"
    />
    <ProjetoModalStatus
      v-else-if="modal?.tipo === 'status'"
      :key="modal.projeto.id"
      :projeto="modal.projeto"
      @fechar="cancelarAcao"
      @atualizado="aoAlterarStatus"
      @desatualizado="carregar"
    />
  </section>
</template>

<style scoped>
.pagina {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: 20px;
}

.pagina > :first-child {
  margin-bottom: 12px;
}

/* Figma: quatro cartões de mesma largura, ~21px entre eles. */
.indicadores {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 21px;
}

/* Status e Tipo não cabem na mesma linha da busca em telas estreitas: descem juntos. */
.busca-projetos {
  flex-wrap: wrap;
}

.busca-projetos :deep(.card-busca-campo) {
  flex: 1 1 200px;
}

.busca-projetos :deep(.card-busca-filtros) {
  flex: 0 1 auto;
}

/* Cabem as 4 linhas da página (cabeçalho 42 + 4 x 76 + rodapé 63): se a tela for baixa, a página rola em vez de cortar a última. */
.tabela-projetos {
  min-height: 409px;
}

/* Abaixo de ~860px de largura útil, rolagem horizontal em vez de espremer as colunas. */
.tabela-projetos :deep(table) {
  min-width: 860px;
}

.tabela-projetos :deep(th),
.tabela-projetos :deep(td) {
  padding-inline: 10px;
}

.tabela-projetos :deep(td) {
  height: 76px;
  padding-block: 8px;
}

/* Valor principal (13px) e linha de apoio abaixo (11px #999), como no Figma. */
.celula-principal {
  display: block;
  color: #333;
  font-size: 13px;
}

.celula-numero {
  color: var(--fp-texto-corpo);
}

.celula-valor {
  font-weight: 600;
}

.celula-secundaria {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11px;
}

.celula-bloco {
  margin-bottom: 4px;
}

.acoes {
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 1000px) {
  .indicadores {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
