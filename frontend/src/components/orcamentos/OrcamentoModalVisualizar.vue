<script setup lang="ts">
import { computed } from 'vue'
import type { Orcamento, StatusDefinivel } from '../../types'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import {
  decimalApiParaTexto,
  enderecoEmUmaLinha,
  formatarNumeroOrcamento,
  orcamentoAprovavel,
  orcamentoEditavel,
  rotuloUnidade,
  statusDestinos,
} from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import MenuMaisAcoes, { type ItemMenuAcao } from '../ui/MenuMaisAcoes.vue'
import ModalBase from '../ui/ModalBase.vue'
import OrcamentoItemVisualizacao from './OrcamentoItemVisualizacao.vue'
import SeloStatusOrcamento from './SeloStatusOrcamento.vue'
import SeloTipoOrcamento from './SeloTipoOrcamento.vue'

const props = defineProps<{
  orcamento: Orcamento
  /** Usuário logado pode gerenciar orçamentos (editar, aprovar, mudar status). */
  podeGerenciar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  editar: []
  aprovar: []
  'baixar-pdf': []
  status: [destino: StatusDefinivel]
}>()

const editavel = computed(() => orcamentoEditavel(props.orcamento.status))
const aprovavel = computed(() => orcamentoAprovavel(props.orcamento.status))

// O orçamento já traz o endereço do cliente (inclusive de cliente inativo, para o histórico).
const endereco = computed(() => {
  const { cliente } = props.orcamento
  return enderecoEmUmaLinha(cliente) || `${cliente.cidade}/${cliente.estado}`
})

const materiais = computed(() =>
  props.orcamento.materiais.map((item) => ({
    chave: item.id,
    nome: item.material.nome,
    unidade: rotuloUnidade(item.material.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

const servicos = computed(() =>
  props.orcamento.servicos.map((item) => ({
    chave: item.id,
    nome: item.servico.nome,
    descricao: item.descricaoAdicional,
    unidade: rotuloUnidade(item.servico.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

const desconto = computed(() => Number(props.orcamento.desconto))

// Ações de status que o Figma não mostra: ficam num menu discreto, sempre com confirmação.
const ROTULO_ACAO: Record<StatusDefinivel, string> = {
  PENDENTE: 'Voltar para Pendente',
  EM_ANALISE: 'Marcar como Em Análise',
  REPROVADO: 'Reprovar orçamento',
  CANCELADO: 'Cancelar orçamento',
}

const itensMenu = computed<ItemMenuAcao[]>(() =>
  statusDestinos(props.orcamento.status).map((destino) => ({
    valor: destino,
    rotulo: ROTULO_ACAO[destino],
    perigo: destino === 'CANCELADO' || destino === 'REPROVADO',
  })),
)
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes do Orçamento"
    icone="olho"
    largura="680px"
    @fechar="emit('fechar')"
  >
    <header class="topo">
      <h3 class="topo-titulo">
        {{ orcamento.titulo }}
      </h3>
      <div class="topo-selos">
        <SeloStatusOrcamento :status="orcamento.status" />
        <SeloTipoOrcamento :tipo="orcamento.tipo" />
      </div>
    </header>

    <dl class="dados">
      <CampoLeitura
        class="dados-cliente"
        rotulo="Cliente"
        :valor="orcamento.cliente.nome"
      />
      <CampoLeitura
        rotulo="Código do Orçamento"
        :valor="formatarNumeroOrcamento(orcamento.numero)"
      />
      <CampoLeitura
        class="dados-cliente"
        rotulo="Previsão Estimada de Entrega (dias)"
        :valor="String(orcamento.prazoEstimadoDias)"
      />
      <CampoLeitura
        rotulo="Data do Orçamento"
        :valor="isoParaDataBr(orcamento.dataEmissao)"
      />
      <CampoLeitura
        class="dados-largo"
        rotulo="Endereço de entrega"
        :valor="endereco"
      />
    </dl>

    <section
      v-if="materiais.length > 0"
      class="secao"
    >
      <h4 class="secao-titulo">
        Materiais ({{ materiais.length }})
      </h4>
      <div class="itens">
        <OrcamentoItemVisualizacao
          v-for="item in materiais"
          :key="item.chave"
          rotulo="Material"
          :nome="item.nome"
          :unidade="item.unidade"
          :quantidade="item.quantidade"
          :valor-unitario="item.valorUnitario"
          :total="item.total"
        />
      </div>
    </section>

    <section
      v-if="servicos.length > 0"
      class="secao"
    >
      <h4 class="secao-titulo">
        Serviços / Mão de Obra ({{ servicos.length }})
      </h4>
      <div class="itens">
        <OrcamentoItemVisualizacao
          v-for="item in servicos"
          :key="item.chave"
          rotulo="Serviço"
          :nome="item.nome"
          :descricao="item.descricao"
          :unidade="item.unidade"
          :quantidade="item.quantidade"
          :valor-unitario="item.valorUnitario"
          :total="item.total"
        />
      </div>
    </section>

    <dl class="dados dados--unica">
      <CampoLeitura
        class="dados-largo"
        rotulo="Observações"
        :valor="orcamento.observacoes || '-'"
      />
    </dl>

    <div class="total">
      <div class="total-rotulo">
        Valor Total do Orçamento
        <span
          v-if="desconto > 0"
          class="total-desconto"
        >(desconto de {{ formatarMoeda(desconto) }} incluído)</span>
      </div>
      <div class="total-valor">
        {{ formatarMoeda(orcamento.valorTotal) }}
      </div>
    </div>

    <template #rodape-esquerda>
      <div class="rodape-esquerda">
        <BotaoFp
          v-if="podeGerenciar && editavel"
          variante="link"
          @click="emit('editar')"
        >
          <template #icone>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              class="icone-lapis"
            >
              <path d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
              <path d="M18.4 2.6a2 2 0 0 1 2.9 2.9L12 14.8 8 16l1.2-4z" />
            </svg>
          </template>
          Editar
        </BotaoFp>
        <MenuMaisAcoes
          v-if="podeGerenciar && itensMenu.length > 0"
          :itens="itensMenu"
          @escolher="emit('status', $event as StatusDefinivel)"
        />
      </div>
    </template>
    <template #rodape>
      <div class="rodape-acoes">
        <BotaoFp
          variante="secundario"
          @click="emit('baixar-pdf')"
        >
          <template #icone>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              class="icone-lapis"
            >
              <path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M4.5 19.5h15" />
            </svg>
          </template>
          Baixar PDF
        </BotaoFp>
        <BotaoFp
          v-if="podeGerenciar && aprovavel"
          class="rodape-principal"
          @click="emit('aprovar')"
        >
          Aprovar
        </BotaoFp>
        <BotaoFp
          variante="secundario"
          @click="emit('fechar')"
        >
          Fechar
        </BotaoFp>
      </div>
    </template>
  </ModalBase>
</template>

<style scoped>
.topo {
  margin-bottom: 18px;
}

.topo-titulo {
  margin: 0 0 8px;
  color: #222;
  font-size: 20px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.topo-selos {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dados {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.dados-cliente {
  grid-column: span 2;
}

.dados-largo {
  grid-column: 1 / -1;
}

.dados--unica {
  margin-top: 20px;
}

.secao {
  margin-top: 22px;
}

.secao-titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.itens {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  margin-top: 20px;
  padding: 16px 20px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.total-rotulo {
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.total-desconto {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

.total-valor {
  color: var(--fp-verde);
  font-size: 24px;
  font-weight: 700;
}

.rodape-esquerda {
  display: flex;
  align-items: center;
  gap: 14px;
}

.rodape-acoes {
  display: contents;
}

.icone-lapis {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Celular: ação principal em largura total; Baixar PDF e Fechar lado a lado; Editar e Mais ações numa linha só. */
@media (max-width: 575px) {
  .rodape-esquerda {
    width: 100%;
    justify-content: space-between;
  }

  .rodape-esquerda:empty {
    display: none;
  }

  .rodape-acoes {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .rodape-principal {
    grid-column: 1 / -1;
    order: -1;
  }
}

@media (max-width: 600px) {
  .dados {
    grid-template-columns: 1fr;
  }

  .dados-cliente {
    grid-column: auto;
  }
}
</style>
