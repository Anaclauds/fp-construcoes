<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useProjetoDetalhe } from '../../composables/useProjetoDetalhe'
import type { ProjetoResumo } from '../../types/projeto'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import { decimalApiParaTexto, formatarNumeroOrcamento, rotuloUnidade } from '../../utils/orcamentos'
import { enderecoDaObra } from '../../utils/projetos'
import OrcamentoItemVisualizacao from '../orcamentos/OrcamentoItemVisualizacao.vue'
import SeloTipoOrcamento from '../orcamentos/SeloTipoOrcamento.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import ProjetoCobrancasLista from './ProjetoCobrancasLista.vue'
import ProjetoRegistrosObra from './ProjetoRegistrosObra.vue'
import SeloStatusProjeto from './SeloStatusProjeto.vue'

const props = defineProps<{
  projeto: ProjetoResumo
  /** Usuário logado pode gerenciar projetos (iniciar, registrar etapa/extra, mudar status). */
  podeGerenciar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  iniciar: []
  etapa: []
  extra: []
  status: []
}>()

const detalhe = useProjetoDetalhe(props.projeto.id)
onMounted(detalhe.carregar)

const { orcamento } = props.projeto
const construcaoCivil = orcamento.tipo === 'CONSTRUCAO_CIVIL'

// O detalhe mais recente (depois de carregar) manda; antes disso vale o resumo da lista.
const atual = computed(() => detalhe.projeto.value ?? props.projeto)

const data = (iso: string | null) => (iso ? isoParaDataBr(iso) : '')

// Figma: Planejado mostra "Previsão de Início"; Em Execução e Concluído mostram "Início" (data real) e,
// no concluído, "Conclusão" no lugar da previsão.
const datas = computed(() => {
  const projeto = atual.value
  const iniciado = projeto.status !== 'PLANEJADO'
  const inicio = iniciado
    ? { rotulo: 'Início', valor: data(projeto.dataInicio) }
    : { rotulo: 'Previsão de Início', valor: data(projeto.previsaoInicio) }
  const fim =
    projeto.status === 'CONCLUIDO'
      ? { rotulo: 'Conclusão', valor: data(projeto.dataConclusao) }
      : { rotulo: 'Previsão de Conclusão', valor: data(projeto.previsaoConclusao) }
  return [inicio, fim]
})

const materiais = computed(() =>
  (detalhe.projeto.value?.orcamento.materiais ?? []).map((item) => ({
    chave: item.id,
    nome: item.material.nome,
    unidade: rotuloUnidade(item.material.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

const servicos = computed(() =>
  (detalhe.projeto.value?.orcamento.servicos ?? []).map((item) => ({
    chave: item.id,
    nome: item.servico.nome,
    descricao: item.descricaoAdicional,
    unidade: rotuloUnidade(item.servico.unidadeMedida),
    quantidade: decimalApiParaTexto(item.quantidade),
    valorUnitario: formatarMoeda(item.valorUnitario),
    total: formatarMoeda(item.valorTotal),
  })),
)

const emExecucao = computed(() => atual.value.status === 'EM_EXECUCAO')
const planejado = computed(() => atual.value.status === 'PLANEJADO')
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes do Projeto"
    icone="olho"
    largura="983px"
    @fechar="emit('fechar')"
  >
    <header class="topo">
      <h3 class="topo-titulo">
        {{ orcamento.titulo }}
      </h3>
      <p class="topo-cliente">
        {{ orcamento.cliente.nome }}
      </p>
    </header>

    <dl class="dados">
      <div class="dado-status">
        <dt>Status Atual</dt>
        <dd class="dado-status-valor">
          <SeloStatusProjeto :status="atual.status" />
          <SeloTipoOrcamento :tipo="orcamento.tipo" />
        </dd>
      </div>
      <CampoLeitura
        v-for="item in datas"
        :key="item.rotulo"
        :rotulo="item.rotulo"
        :valor="item.valor"
      />
      <CampoLeitura
        class="dados-largo"
        rotulo="Endereço de Entrega/Serviço"
        :valor="enderecoDaObra(atual)"
      />
      <CampoLeitura
        rotulo="Código do Projeto"
        :valor="formatarNumeroOrcamento(orcamento.numero)"
      />
      <CampoLeitura
        class="dados-largo"
        rotulo="Responsável"
        :valor="projeto.responsavel.nomeCompleto"
      />
    </dl>

    <section class="secao">
      <h4 class="secao-titulo">
        Orçamento (Referência)
      </h4>
      <div class="referencia">
        <p class="referencia-codigo">
          Código de Orçamento {{ formatarNumeroOrcamento(orcamento.numero) }}
        </p>
        <p class="referencia-aviso">
          Este orçamento foi aprovado e convertido em projeto. Os itens e valores abaixo são os do orçamento aprovado.
        </p>
      </div>
    </section>

    <p
      v-if="detalhe.carregando.value && !detalhe.projeto.value"
      class="estado"
      role="status"
    >
      Carregando detalhes do projeto...
    </p>
    <p
      v-else-if="detalhe.erro.value"
      class="estado estado--erro"
      role="alert"
    >
      {{ detalhe.erro.value }}
      <button
        type="button"
        class="estado-tentar"
        @click="detalhe.carregar"
      >
        Tentar novamente
      </button>
    </p>

    <template v-else-if="detalhe.projeto.value">
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

      <ProjetoCobrancasLista
        class="secao"
        :cobrancas="detalhe.projeto.value.cobrancas"
        :status-projeto="atual.status"
        :construcao-civil="construcaoCivil"
        :recebimentos-disponiveis="detalhe.recebimentosDisponiveis.value"
        :recebimentos-da-parcela="detalhe.recebimentosDaParcela"
      />

      <ProjetoRegistrosObra
        class="secao"
        :etapas="detalhe.projeto.value.etapas"
        :extras="detalhe.projeto.value.extras"
      />
    </template>

    <div class="total">
      <div class="total-rotulo">
        Valor Total do Projeto
      </div>
      <div class="total-valor">
        {{ formatarMoeda(orcamento.valorTotal) }}
      </div>
    </div>

    <template
      v-if="podeGerenciar && (planejado || emExecucao)"
      #rodape-esquerda
    >
      <div class="atalhos">
        <BotaoFp
          v-if="planejado"
          variante="link"
          @click="emit('iniciar')"
        >
          Iniciar projeto
        </BotaoFp>
        <template v-if="emExecucao">
          <BotaoFp
            v-if="construcaoCivil"
            variante="link"
            @click="emit('etapa')"
          >
            Registrar etapa
          </BotaoFp>
          <BotaoFp
            variante="link"
            @click="emit('extra')"
          >
            Registrar extra
          </BotaoFp>
          <BotaoFp
            variante="link"
            @click="emit('status')"
          >
            Atualizar status
          </BotaoFp>
        </template>
      </div>
    </template>
    <template #rodape>
      <BotaoFp
        variante="secundario"
        @click="emit('fechar')"
      >
        Fechar
      </BotaoFp>
    </template>
  </ModalBase>
</template>

<style scoped>
.topo {
  margin-bottom: 18px;
}

.topo-titulo {
  margin: 0;
  color: #222;
  font-size: 20px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.topo-cliente {
  margin: 2px 0 0;
  color: #6a7282;
  font-size: 15px;
}

.dados {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.dados-largo {
  grid-column: span 2;
}

.dado-status {
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.dado-status dt {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

.dado-status-valor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
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

.referencia {
  padding: 14px 17px;
  border: 1.3px solid var(--fp-verde-30);
  border-radius: var(--fp-raio);
  background-color: var(--fp-verde-10);
}

.referencia-codigo {
  margin: 0;
  color: #333;
  font-size: 15px;
  font-weight: 600;
}

.referencia-aviso {
  margin: 4px 0 0;
  color: #4a5565;
  font-size: 13px;
}

.itens {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.estado {
  margin: 22px 0 0;
  padding: 14px 17px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  color: #6a7282;
  font-size: 14px;
  text-align: center;
}

.estado--erro {
  border-color: #fca5a5;
  color: var(--fp-vermelho-escuro);
}

.estado-tentar {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  margin-top: 22px;
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

.total-valor {
  color: var(--fp-verde);
  font-size: 24px;
  font-weight: 700;
}

.atalhos {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 20px;
}

@media (max-width: 700px) {
  .dados {
    grid-template-columns: 1fr;
  }

  .dados-largo {
    grid-column: auto;
  }
}
</style>
