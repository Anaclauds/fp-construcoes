<script setup lang="ts">
import { computed, watch } from 'vue'
import { ERRO_LIMITE_ESTOQUE, type FormularioDespesa, type LinhaCompra } from '../../composables/useFormularioDespesa'
import type { OpcoesCompraDespesa } from '../../composables/useOpcoesCompraDespesa'
import type { ItemDespesaMaterial } from '../../types/despesa'
import { centavosParaMoeda, filtrarDecimal, normalizarDecimal } from '../../utils/orcamentos'
import { rotuloUnidade } from '../../utils/materiais'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoAutocomplete, { type OpcaoAutocomplete } from '../ui/CampoAutocomplete.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const props = defineProps<{
  form: FormularioDespesa
  opcoes: OpcoesCompraDespesa
  /** Itens já gravados na despesa em edição: seus materiais continuam escolhíveis mesmo se saírem da lista de ativos. */
  itensAtuais: ItemDespesaMaterial[]
}>()

const mascaraQuantidade = (valor: string) => filtrarDecimal(valor, 3)
const normalizarQuantidade = (valor: string) => normalizarDecimal(valor, 3, 9)
const mascaraValor = (valor: string) => filtrarDecimal(valor, 2)
const normalizarValor = (valor: string) => normalizarDecimal(valor, 2, 9)

interface MaterialEscolhivel {
  id: number
  codigo: string
  nome: string
  unidadeMedida: string
}

const materiais = computed<MaterialEscolhivel[]>(() => {
  const lista: MaterialEscolhivel[] = [...props.opcoes.materiais.value]
  for (const item of props.itensAtuais) {
    if (!lista.some((m) => m.id === item.materialId)) lista.push({ ...item.material, id: item.materialId })
  }
  return lista
})

function detalhe(material: MaterialEscolhivel): string {
  return `${material.codigo} · ${rotuloUnidade(material.unidadeMedida)}`
}

/** Materiais já usados em outras linhas aparecem desabilitados (a API não aceita o mesmo material duas vezes). */
function opcoesDaLinha(linha: LinhaCompra): OpcaoAutocomplete[] {
  const usados = new Set(
    props.form.itens.value.filter((l) => l.chave !== linha.chave && l.materialId !== '').map((l) => l.materialId),
  )
  return materiais.value.map((material) => ({
    valor: String(material.id),
    rotulo: material.nome,
    detalhe: detalhe(material),
    desabilitado: usados.has(String(material.id)),
    motivo: 'Já adicionado',
  }))
}

function apoio(linha: LinhaCompra): string | undefined {
  const material = materiais.value.find((m) => String(m.id) === linha.materialId)
  return material ? detalhe(material) : undefined
}

function aoEscolher(linha: LinhaCompra, materialId: string) {
  const material = materiais.value.find((m) => String(m.id) === materialId)
  // A unidade do estoque é a do cadastro do material; a API não converte unidades, então ela não é editável.
  props.form.escolherMaterial(linha, materialId, material?.unidadeMedida ?? '')
}

// Com permissão de Estoque, busca o saldo de cada material escolhido para mostrar o máximo da compra.
watch(
  () => props.form.itens.value.map((l) => l.materialId),
  (ids) => void props.opcoes.carregarSaldos(ids),
  { immediate: true },
)

/** "Máximo para esta compra: ..." (linha larga abaixo dos campos); com o limite estourado a frase explica o motivo. */
function linhaMaximo(linha: LinhaCompra): { texto: string; erro: boolean } | null {
  const dica = props.form.dicaMaximoCompra(linha)
  if (!dica) return null
  const erro = props.form.errosItens[linha.chave]?.quantidade === ERRO_LIMITE_ESTOQUE
  return { texto: erro ? `O estoque deste material passaria do limite. ${dica}.` : dica, erro }
}

function total(linha: LinhaCompra): string {
  return centavosParaMoeda(props.form.totalDaLinha(linha))
}
</script>

<template>
  <section
    class="itens"
    aria-labelledby="compra-materiais"
  >
    <h3
      id="compra-materiais"
      class="itens-titulo"
    >
      Materiais Comprados
    </h3>

    <p
      v-if="opcoes.erro.value"
      class="aviso-erro"
      role="alert"
    >
      Não foi possível carregar os materiais. {{ opcoes.erro.value }}
      <button
        type="button"
        class="tentar-novamente"
        @click="opcoes.tentarNovamente()"
      >
        Tentar novamente
      </button>
    </p>

    <p
      v-if="opcoes.textoTruncado.value"
      class="aviso-info"
      role="status"
    >
      {{ opcoes.textoTruncado.value }}
    </p>

    <ul class="lista">
      <li
        v-for="(linha, i) in form.itens.value"
        :key="linha.chave"
        class="linha"
        :aria-label="`Material ${i + 1}`"
      >
        <CampoAutocomplete
          class="linha-material"
          :model-value="linha.materialId"
          rotulo="Material:"
          obrigatorio
          placeholder="Busque pelo nome ou código do material"
          icone="lupa"
          :opcoes="opcoesDaLinha(linha)"
          :carregando="opcoes.carregando.value"
          :erro="form.errosItens[linha.chave]?.item"
          :apoio="apoio(linha)"
          texto-vazio="Nenhum material ativo encontrado."
          @update:model-value="aoEscolher(linha, $event)"
        />
        <CampoFormulario
          v-model="linha.quantidade"
          rotulo="Quantidade:"
          obrigatorio
          placeholder="0"
          inputmode="decimal"
          autocomplete="off"
          :mascara="mascaraQuantidade"
          :normalizar="normalizarQuantidade"
          :erro="form.errosItens[linha.chave]?.quantidade"
          @update:model-value="form.aoDigitarItem(linha, 'quantidade')"
        />
        <CampoFormulario
          rotulo="Unidade:"
          somente-leitura
          placeholder="—"
          :model-value="linha.unidade ? rotuloUnidade(linha.unidade) : ''"
        />
        <CampoFormulario
          v-model="linha.valorUnitario"
          rotulo="Valor Unitário:"
          obrigatorio
          placeholder="0,00"
          inputmode="decimal"
          autocomplete="off"
          :mascara="mascaraValor"
          :normalizar="normalizarValor"
          :erro="form.errosItens[linha.chave]?.valorUnitario"
          @update:model-value="form.aoDigitarItem(linha, 'valorUnitario')"
        />
        <CampoFormulario
          rotulo="Total:"
          somente-leitura
          :model-value="total(linha)"
        />
        <BotaoFp
          class="linha-remover"
          variante="perigo-suave"
          tamanho="pagina"
          :aria-label="`Remover material ${i + 1}`"
          @click="form.removerItem(linha.chave)"
        >
          Remover
        </BotaoFp>
        <p
          v-if="linhaMaximo(linha)"
          class="linha-maximo"
          :class="{ 'linha-maximo--erro': linhaMaximo(linha)!.erro }"
        >
          {{ linhaMaximo(linha)!.texto }}
        </p>
      </li>
    </ul>

    <p
      v-if="form.erros.itens"
      class="aviso-erro"
      role="alert"
    >
      {{ form.erros.itens }}
    </p>

    <div class="rodape">
      <button
        type="button"
        class="adicionar"
        @click="form.adicionarItem"
      >
        <span
          class="adicionar-mais"
          aria-hidden="true"
        >+</span>
        Adicionar Material
      </button>
      <p class="total">
        <span>Total da compra</span>
        <strong>{{ form.totalCompraTexto.value }}</strong>
      </p>
    </div>
  </section>
</template>

<style scoped>
.itens {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.itens-titulo {
  margin: 0;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Cada material é um cartão: nome em cima; quantidade, unidade, valor, total e remover embaixo. */
.linha {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.5fr) minmax(0, 1.15fr) minmax(0, 1.15fr) auto;
  gap: 8px 10px;
  align-items: start;

  padding: 12px 14px;
  border: 1px solid var(--fp-verde-20);
  border-radius: var(--fp-raio);
}

.linha-material {
  grid-column: 1 / -1;
}

.linha-maximo {
  grid-column: 1 / -1;
  margin: 0;
  color: #717182;
  font-size: 12.5px;
}

.linha-maximo--erro {
  color: var(--fp-vermelho-escuro);
}

.linha-remover {
  align-self: end;
  height: var(--campo-altura, 42px);
}

.aviso-erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
}

.aviso-info {
  margin: 0;
  padding: 8px 12px;
  border: 1px solid var(--fp-verde-20);
  border-radius: 9px;
  color: var(--fp-texto-titulo-campo);
  font-size: 13.5px;
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

.rodape {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.adicionar {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 0 24px;
  border: 1.5px solid var(--fp-verde);
  border-radius: 9px;
  background-color: #fff;

  color: var(--fp-verde);
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.adicionar:hover {
  background-color: var(--fp-verde-10);
}

.adicionar:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
}

.adicionar-mais {
  font-size: 18px;
  line-height: 1;
}

.total {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
  color: var(--fp-texto-titulo-campo);
  font-size: 14px;
}

.total strong {
  color: var(--fp-verde);
  font-size: 20px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .linha {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .linha-remover {
    grid-column: 1 / -1;
    justify-self: end;
  }
}
</style>
