<script setup lang="ts">
import { computed } from 'vue'
import type { Despesa } from '../../types/despesa'
import { formatarMoeda, formatarCnpj, formatarDataHoraIso, isoParaDataBr } from '../../utils/formatadores'
import { formatarQuantidade } from '../../utils/estoque'
import { rotuloUnidade } from '../../utils/materiais'
import {
  caixaDaDespesaFechado,
  despesaEstornada,
  nomeFornecedor,
  podeEstornarDespesa,
  projetoDoExtra,
} from '../../utils/despesas'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import SeloCategoriaDespesa from './SeloCategoriaDespesa.vue'

const props = defineProps<{
  despesa: Despesa
  /** Usuário com DESPESAS gerenciar: vê o botão de estorno. */
  podeGerenciar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  estornar: [despesa: Despesa]
}>()

const estornada = computed(() => despesaEstornada(props.despesa))
const mostrarEstorno = computed(() => props.podeGerenciar && podeEstornarDespesa(props.despesa))
/** Caixa fechado: nem edição nem estorno enquanto o caixa do mês não for reaberto. */
const caixaFechado = computed(() => !estornada.value && caixaDaDespesaFechado(props.despesa))

const projetoExtra = computed(() => projetoDoExtra(props.despesa))
const registradoPor = computed(
  () => props.despesa.registradoPorUsuario?.funcionario?.nomeCompleto ?? props.despesa.registradoPorUsuario?.login ?? '',
)
const competencia = computed(() => {
  const [ano, mes] = props.despesa.data.slice(0, 10).split('-')
  return `${mes}/${ano}`
})
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes da Despesa"
    icone="olho"
    largura="560px"
    @fechar="emit('fechar')"
  >
    <div class="destaque">
      <span class="destaque-rotulo">Valor</span>
      <strong class="destaque-valor">{{ formatarMoeda(despesa.valorTotal) }}</strong>
    </div>

    <p
      v-if="estornada && despesa.canceladoEm"
      class="aviso aviso--estorno"
      role="status"
    >
      Despesa estornada em {{ formatarDataHoraIso(despesa.canceladoEm) }}. Ela fica no histórico, sem edição, e o caixa
      recebeu a compensação.
    </p>
    <p
      v-else-if="projetoExtra !== null"
      class="aviso"
    >
      Despesa gerada pelo extra do projeto {{ projetoExtra }}. O valor e a data acompanham o projeto (só a descrição
      pode ser editada) e o estorno é feito cancelando o extra no projeto.
    </p>
    <p
      v-if="caixaFechado"
      class="aviso"
    >
      O caixa de {{ competencia }} está fechado: esta despesa não pode ser editada nem estornada até o caixa ser
      reaberto.
    </p>

    <dl class="linhas">
      <div class="linha">
        <dt>Data:</dt>
        <dd>{{ isoParaDataBr(despesa.data) }}</dd>
      </div>
      <div class="linha">
        <dt>Categoria:</dt>
        <dd><SeloCategoriaDespesa :categoria="despesa.categoria" /></dd>
      </div>
      <div class="linha linha--texto">
        <dt>Descrição:</dt>
        <dd class="texto-longo">
          {{ despesa.descricao }}
        </dd>
      </div>
      <div
        v-if="despesa.fornecedor"
        class="linha"
      >
        <dt>Fornecedor:</dt>
        <dd>
          {{ nomeFornecedor(despesa.fornecedor) }}
          <span class="apoio">{{ formatarCnpj(despesa.fornecedor.cnpj) }}</span>
        </dd>
      </div>
      <div
        v-if="registradoPor"
        class="linha"
      >
        <dt>Registrada por:</dt>
        <dd>{{ registradoPor }}</dd>
      </div>
    </dl>

    <section
      v-if="despesa.materiais.length > 0"
      class="materiais"
      aria-labelledby="despesa-materiais"
    >
      <h3
        id="despesa-materiais"
        class="secao-titulo"
      >
        Material Comprado
      </h3>
      <ul class="lista-materiais">
        <li
          v-for="item in despesa.materiais"
          :key="item.id"
          class="material"
        >
          <dl class="linhas">
            <div class="linha">
              <dt>Material:</dt>
              <dd>{{ item.material.nome }} <span class="apoio">{{ item.material.codigo }}</span></dd>
            </div>
            <div class="linha">
              <dt>Quantidade:</dt>
              <dd>{{ formatarQuantidade(item.quantidade) || item.quantidade }} {{ rotuloUnidade(item.unidadeMedida) }}</dd>
            </div>
            <div class="linha">
              <dt>Valor unitário:</dt>
              <dd>{{ formatarMoeda(item.valorUnitario) }}</dd>
            </div>
            <div class="linha">
              <dt>Total do item:</dt>
              <dd>{{ formatarMoeda(item.valorTotal) }}</dd>
            </div>
          </dl>
        </li>
      </ul>
    </section>

    <p class="nota">
      <template v-if="estornada">
        O valor saiu do caixa de {{ competencia }} e voltou como estorno no mesmo mês.
      </template>
      <template v-else-if="despesa.tipo === 'COMPRA_MATERIAL'">
        Esta compra deu entrada no estoque dos materiais acima e saiu do caixa de {{ competencia }}.
      </template>
      <template v-else>
        Esta despesa saiu do caixa de {{ competencia }}.
      </template>
    </p>

    <template #rodape>
      <BotaoFp
        v-if="mostrarEstorno"
        variante="perigo-suave"
        @click="emit('estornar', despesa)"
      >
        Estornar Despesa
      </BotaoFp>
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
.destaque {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 0 16px;
}

.destaque-rotulo {
  color: var(--fp-cinza-rotulo);
  font-size: 13px;
  font-weight: 500;
}

.destaque-valor {
  color: var(--fp-verde);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.2;
}

.aviso {
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;
  color: #b45309;
  font-size: 13px;
}

.aviso--estorno {
  border-color: #fca5a5;
  background-color: #fef2f2;
  color: var(--fp-vermelho-escuro);
}

.linhas {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.linha {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 9px 0;
  border-bottom: 1px solid #f0f1f3;
}

.linha dt {
  flex-shrink: 0;
  color: var(--fp-cinza-rotulo);
  font-size: 13px;
  font-weight: 500;
}

.linha dd {
  margin: 0;
  min-width: 0;
  color: #333;
  font-size: 14px;
  font-weight: 600;
  text-align: right;
}

.texto-longo {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

/* Descrição pode ter várias linhas (ex.: despesa de extra de projeto): rótulo em cima e texto alinhado à esquerda. */
.linha--texto {
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}

.linha--texto dd {
  text-align: left;
  font-weight: 500;
}

.apoio {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 11.5px;
  font-weight: 500;
}

.secao-titulo {
  margin: 20px 0 6px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.lista-materiais {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.material {
  padding: 2px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.material .linha:last-child {
  border-bottom: 0;
}

.nota {
  margin: 16px 0 0;
  color: #717182;
  font-size: 12.5px;
}
</style>
