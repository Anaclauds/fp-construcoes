<script setup lang="ts">
import { computed } from 'vue'
import type { ErrosLinhaExtra, LinhaExtraMaterial } from '../../composables/useFormularioExtraProjeto'
import type { OpcaoMaterial } from '../../types/orcamento'
import { mascararMoeda } from '../../utils/formatadores'
import { centavosParaMoeda, mascararDecimal, rotuloUnidade, textoParaEscala } from '../../utils/orcamentos'
import { centavosDoCampoMoeda } from '../../utils/projetos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoAutocomplete from '../ui/CampoAutocomplete.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const props = defineProps<{
  linhas: LinhaExtraMaterial[]
  opcoes: OpcaoMaterial[]
  erros: Record<number, ErrosLinhaExtra>
  materiaisEmUso: (exceto: LinhaExtraMaterial) => Set<string>
  carregando: boolean
}>()

const emit = defineEmits<{
  adicionar: []
  remover: [linha: LinhaExtraMaterial]
}>()

const mascararQuantidade = (valor: string) => mascararDecimal(valor, 3, 9)

const materiais = computed(() => new Map(props.opcoes.map((m) => [String(m.id), m])))

function opcoesDaLinha(linha: LinhaExtraMaterial) {
  const emUso = props.materiaisEmUso(linha)
  return props.opcoes.map((m) => ({
    valor: String(m.id),
    rotulo: m.nome,
    detalhe: `${m.codigo} · ${rotuloUnidade(m.unidadeMedida)}`,
    desabilitado: emUso.has(String(m.id)),
    motivo: 'já adicionado',
  }))
}

function unidadeDaLinha(linha: LinhaExtraMaterial): string {
  const material = materiais.value.get(linha.materialId)
  return material ? rotuloUnidade(material.unidadeMedida) : ''
}

function totalDaLinha(linha: LinhaExtraMaterial): string {
  const quantidade = textoParaEscala(linha.quantidade, 3)
  const custo = centavosDoCampoMoeda(linha.custo)
  return quantidade === null || custo === null ? '—' : centavosParaMoeda(Math.round((quantidade * custo) / 1000))
}

function editarCusto(linha: LinhaExtraMaterial, valor: string) {
  linha.custo = valor
  linha.custoEditado = true
}
</script>

<template>
  <section class="itens">
    <h3 class="secao-titulo">
      Materiais Adicionais
    </h3>
    <p class="secao-apoio">
      O material adicional é reservado do estoque ao registrar o extra. Sem saldo suficiente o registro é recusado.
    </p>

    <article
      v-for="(linha, indice) in linhas"
      :key="linha.uid"
      class="linha"
    >
      <header class="linha-topo">
        <span class="linha-numero">Material {{ indice + 1 }}</span>
        <button
          type="button"
          class="linha-remover"
          :aria-label="`Remover material ${indice + 1}`"
          :disabled="linhas.length === 1 && linha.materialId === '' && linha.quantidade === ''"
          @click="emit('remover', linha)"
        >
          Remover
        </button>
      </header>

      <CampoAutocomplete
        v-model="linha.materialId"
        rotulo="Nome do Material:"
        obrigatorio
        icone="lupa"
        :placeholder="carregando ? 'Carregando materiais...' : 'Selecione...'"
        :opcoes="opcoesDaLinha(linha)"
        :desabilitado="carregando"
        texto-vazio="Nenhum material encontrado."
        :erro="erros[linha.uid]?.item"
      />

      <div class="linha-grade">
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Qtd.:"
          obrigatorio
          placeholder="0"
          autocomplete="off"
          inputmode="decimal"
          :mascara="mascararQuantidade"
          :erro="erros[linha.uid]?.quantidade"
        />
        <CampoFormulario
          :model-value="unidadeDaLinha(linha)"
          rotulo="Unidade de Medida:"
          somente-leitura
          placeholder="—"
        />
        <CampoFormulario
          :model-value="linha.custo"
          rotulo="Custo interno estimado (R$):"
          aviso="Valor por unidade."
          obrigatorio
          placeholder="R$ 0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascararMoeda"
          :erro="erros[linha.uid]?.custo"
          @update:model-value="editarCusto(linha, $event)"
        />
        <CampoFormulario
          :model-value="totalDaLinha(linha)"
          rotulo="Custo total:"
          somente-leitura
          placeholder="—"
        />
      </div>
    </article>

    <div>
      <BotaoFp
        variante="secundario"
        tamanho="compacto"
        :desabilitado="carregando"
        @click="emit('adicionar')"
      >
        + Adicionar material
      </BotaoFp>
    </div>
  </section>
</template>

<style scoped>
.itens {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.secao-apoio {
  margin: -8px 0 0;
  color: #6a7282;
  font-size: 12.5px;
}

.linha {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1.3px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
  background-color: var(--fp-cinza-fundo);
}

.linha-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.linha-numero {
  color: #4a5565;
  font-size: 13px;
  font-weight: 600;
}

.linha-remover {
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--fp-vermelho);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.linha-remover:hover:not(:disabled) {
  text-decoration: underline;
}

.linha-remover:disabled {
  visibility: hidden;
}

.linha-remover:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.linha-grade {
  display: grid;
  grid-template-columns: 0.7fr 0.9fr 1.5fr 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 760px) {
  .linha-grade {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
