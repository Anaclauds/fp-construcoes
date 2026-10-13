<script setup lang="ts">
import { computed } from 'vue'
import type { FormularioOrcamento, LinhaMaterial } from '../../composables/useFormularioOrcamento'
import { centavosParaMoeda, mascararDecimal, rotuloUnidade, totalDoItem } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoAutocomplete, { type OpcaoAutocomplete } from '../ui/CampoAutocomplete.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'
import BotaoAdicionarItem from './BotaoAdicionarItem.vue'

const props = defineProps<{ form: FormularioOrcamento }>()

const mascaraQuantidade = (valor: string) => mascararDecimal(valor, 3)
const mascaraValor = (valor: string) => mascararDecimal(valor, 2)

/** Opções de uma linha: materiais já usados em outras linhas aparecem desabilitados (sem repetição). */
function opcoesDaLinha(linha: LinhaMaterial): OpcaoAutocomplete[] {
  const usados = new Set(
    props.form.materiais.value.filter((l) => l.chave !== linha.chave && l.materialId !== '').map((l) => l.materialId),
  )
  return props.form.listaMateriais.value.map((material) => ({
    valor: String(material.id),
    rotulo: material.nome,
    detalhe: `${material.codigo} · ${rotuloUnidade(material.unidadeMedida)}`,
    desabilitado: usados.has(String(material.id)),
    motivo: 'Já adicionado',
  }))
}

const apoios = computed(() => {
  const mapa = new Map<number, string>()
  for (const linha of props.form.materiais.value) {
    const material = props.form.listaMateriais.value.find((m) => String(m.id) === linha.materialId)
    if (material) mapa.set(linha.chave, `${material.codigo} · ${rotuloUnidade(material.unidadeMedida)}`)
  }
  return mapa
})

function total(linha: LinhaMaterial): string {
  return centavosParaMoeda(totalDoItem(linha) ?? 0)
}
</script>

<template>
  <section
    class="secao"
    aria-labelledby="orc-materiais"
  >
    <h3
      id="orc-materiais"
      class="secao-titulo"
    >
      Materiais
    </h3>

    <p
      v-if="form.opcoes.erro.value"
      class="aviso-erro"
      role="alert"
    >
      Não foi possível carregar os materiais. {{ form.opcoes.erro.value }}
      <button
        type="button"
        class="tentar-novamente"
        @click="form.opcoes.carregar()"
      >
        Tentar novamente
      </button>
    </p>

    <div class="itens">
      <div
        v-for="(linha, i) in form.materiais.value"
        :key="linha.chave"
        class="linha"
        :class="{ 'linha--primeira': i === 0 }"
        role="group"
        :aria-label="`Material ${i + 1}`"
      >
        <CampoAutocomplete
          :model-value="linha.materialId"
          rotulo="Material:"
          placeholder="Ex: Perfil U Enrijecido de Aço Galvanizado"
          :opcoes="opcoesDaLinha(linha)"
          :carregando="form.opcoes.carregando.value"
          :erro="form.errosMateriais[linha.chave]?.item"
          :apoio="apoios.get(linha.chave)"
          texto-vazio="Nenhum material encontrado."
          @update:model-value="form.escolherMaterial(linha, $event)"
        />
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Quantidade:"
          placeholder="0"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraQuantidade"
          :erro="form.errosMateriais[linha.chave]?.quantidade"
          @update:model-value="form.aoDigitarMaterial(linha, 'quantidade')"
        />
        <CampoFormulario
          v-model="linha.valorUnitario"
          rotulo="Valor Unitário:"
          placeholder="0,00"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraValor"
          :erro="form.errosMateriais[linha.chave]?.valorUnitario"
          @update:model-value="form.aoDigitarMaterial(linha, 'valorUnitario')"
        />
        <CampoFormulario
          rotulo="Total:"
          somente-leitura
          :model-value="total(linha)"
        />
        <BotaoFp
          class="remover"
          variante="perigo-suave"
          tamanho="pagina"
          :aria-label="`Remover material ${i + 1}`"
          @click="form.removerMaterial(linha.chave)"
        >
          Remover
        </BotaoFp>
      </div>
    </div>

    <BotaoAdicionarItem
      rotulo="Adicionar Material"
      :data-erro-foco="form.erros.itens ? 'true' : undefined"
      @click="form.adicionarMaterial"
    />
  </section>
</template>

<style scoped>
.secao {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}

.secao-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: var(--orc-titulo-secao, 22px);
  font-weight: 500;
}

.itens {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Colunas: material | quantidade | valor unitário | total | remover. */
.linha {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--col-qtd, 112px) var(--col-valor, 135px) var(--col-total, 135px) var(--col-remover, 104px);
  gap: 10px;
  align-items: start;
}

/* Rótulos só na primeira linha; nas demais ficam só para leitor de tela. */
.linha:not(.linha--primeira) :deep(.campo-rotulo),
.linha:not(.linha--primeira) :deep(.autocomplete-rotulo) {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.remover {
  margin-top: 0;
  height: var(--campo-altura, 42px);
}

.linha--primeira .remover {
  margin-top: 27px;
}

.aviso-erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

.tentar-novamente {
  margin-left: 8px;
  border: 0;
  background: none;
  color: var(--fp-verde);
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

/* Bloco estreito: cada item vira um cartão com rótulos em todas as linhas. */
@container (max-width: 700px) {
  .linha {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding: 14px;
    border: 1px solid var(--fp-verde-20);
    border-radius: var(--fp-raio);
  }

  .linha > :first-child {
    grid-column: 1 / -1;
  }

  .linha:not(.linha--primeira) :deep(.campo-rotulo),
  .linha:not(.linha--primeira) :deep(.autocomplete-rotulo) {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
  }

  .linha .remover,
  .linha--primeira .remover {
    grid-column: 1 / -1;
    margin-top: 0;
    justify-self: end;
  }
}
</style>
