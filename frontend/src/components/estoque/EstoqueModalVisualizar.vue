<script setup lang="ts">
import { computed } from 'vue'
import { useDetalheEstoque } from '../../composables/useDetalheEstoque'
import type { ItemEstoque, MovimentacaoEstoque } from '../../types/estoque'
import { agruparProjetos, quantidadeComUnidade } from '../../utils/estoque'
import { formatarMoeda, instanteParaDataBrNegocio, isoParaDataBr } from '../../utils/formatadores'
import BotaoFp from '../ui/BotaoFp.vue'
import ModalBase from '../ui/ModalBase.vue'
import EstoqueResumoSaldo from './EstoqueResumoSaldo.vue'

const props = defineProps<{ item: ItemEstoque }>()

const emit = defineEmits<{ fechar: [] }>()

const { detalhe, carregando, erro, carregar } = useDetalheEstoque(props.item.id)

const projetos = computed(() => agruparProjetos(detalhe.value?.projetosUtilizando ?? []))

/** Valor total da compra (`despesaMaterial`); vazio quando a movimentação não tem despesa vinculada. */
function valorCompra(compra: MovimentacaoEstoque): string {
  const total = compra.despesaMaterial?.valorTotal
  return total ? formatarMoeda(total) : ''
}

/** Data da compra (dia da despesa); sem despesa vinculada, usa o instante em que o estoque foi movimentado. */
function dataCompra(compra: MovimentacaoEstoque): { texto: string; registro: boolean } {
  const dia = compra.despesaMaterial?.despesa?.data
  if (dia) return { texto: isoParaDataBr(dia), registro: false }
  return { texto: instanteParaDataBrNegocio(compra.dataHora), registro: true }
}

/** Projeto da baixa e justificativa (quando houver), em uma linha de apoio. */
function detalheBaixa(baixa: MovimentacaoEstoque): string {
  return [baixa.projeto, baixa.justificativa].filter(Boolean).join(' · ')
}

function quem(movimentacao: MovimentacaoEstoque): string {
  return movimentacao.registradoPorUsuario?.funcionario?.nomeCompleto ?? ''
}
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes do Estoque"
    icone="olho"
    largura="680px"
    @fechar="emit('fechar')"
  >
    <p
      v-if="carregando"
      class="mensagem"
      role="status"
    >
      Carregando...
    </p>
    <div
      v-else-if="erro || !detalhe"
      class="mensagem mensagem--erro"
      role="alert"
    >
      {{ erro ?? 'Não foi possível carregar o estoque deste material.' }}
      <button
        type="button"
        class="tentar"
        @click="carregar"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else>
      <EstoqueResumoSaldo
        titulo="Resumo Atual"
        :nome="detalhe.nome"
        :categoria="detalhe.categoria"
        :unidade="detalhe.unidadeMedida"
        :saldo="detalhe.saldo"
      />

      <section class="secao">
        <h3 class="secao-titulo">
          Projetos Utilizando o Material
        </h3>
        <ul
          v-if="projetos.length > 0"
          class="lista"
        >
          <li
            v-for="projeto in projetos"
            :key="projeto.projetoId"
          >
            <span class="principal">
              {{ projeto.titulo }}
              <small v-if="projeto.cliente">{{ projeto.cliente }}</small>
            </span>
            <span class="lateral">{{ quantidadeComUnidade(projeto.quantidade, detalhe.unidadeMedida) }} reservados</span>
          </li>
        </ul>
        <p
          v-else
          class="vazio"
        >
          Nenhum projeto com reserva ativa.
        </p>
      </section>

      <section class="secao">
        <h3 class="secao-titulo">
          Últimas Compras
        </h3>
        <ul
          v-if="detalhe.ultimasCompras.length > 0"
          class="lista"
        >
          <li
            v-for="compra in detalhe.ultimasCompras"
            :key="compra.id"
          >
            <span class="principal">
              <template v-if="dataCompra(compra).registro">
                <span class="registro">Registrado em</span>
              </template>
              {{ dataCompra(compra).texto }}
              <small v-if="quem(compra)">{{ quem(compra) }}</small>
            </span>
            <span class="lateral">
              {{ quantidadeComUnidade(compra.quantidade, detalhe.unidadeMedida) }} comprados
              <strong v-if="valorCompra(compra)">{{ valorCompra(compra) }}</strong>
            </span>
          </li>
        </ul>
        <p
          v-else
          class="vazio"
        >
          Nenhuma compra registrada.
        </p>
      </section>

      <section class="secao">
        <h3 class="secao-titulo">
          Últimas Baixas Realizadas
        </h3>
        <ul
          v-if="detalhe.ultimasBaixas.length > 0"
          class="lista"
        >
          <li
            v-for="baixa in detalhe.ultimasBaixas"
            :key="baixa.id"
          >
            <span class="principal">
              {{ instanteParaDataBrNegocio(baixa.dataHora) }}
              <small v-if="detalheBaixa(baixa)">{{ detalheBaixa(baixa) }}</small>
            </span>
            <span class="lateral">{{ quantidadeComUnidade(baixa.quantidade, detalhe.unidadeMedida) }} baixados</span>
          </li>
        </ul>
        <p
          v-else
          class="vazio"
        >
          Nenhuma baixa registrada.
        </p>
      </section>
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
.mensagem {
  margin: 0;
  padding: 24px 0;
  color: #6a7282;
  font-size: 14px;
  text-align: center;
}

.mensagem--erro {
  color: var(--fp-vermelho-escuro);
}

.tentar {
  display: block;
  margin: 8px auto 0;
  padding: 0;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.secao {
  margin-top: 20px;
}

.secao-titulo {
  margin: 0 0 10px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lista li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
  font-size: 14px;
}

.principal {
  min-width: 0;
  color: #333;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.registro {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

.principal small {
  display: block;
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
  font-weight: 400;
}

.lateral {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: #4a5565;
  font-size: 13px;
  text-align: right;
}

.lateral strong {
  color: #333;
}

.vazio {
  margin: 0;
  padding: 10px 14px;
  border: 1px dashed var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  color: #6a7282;
  font-size: 13px;
}

@media (max-width: 520px) {
  .lista li {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .lateral {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
