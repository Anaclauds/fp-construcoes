<script setup lang="ts">
import { computed } from 'vue'
import type { EtapaRegistrada, ExtraRegistrado } from '../../types/projeto'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import { decimalApiParaTexto, rotuloUnidade } from '../../utils/orcamentos'

const props = defineProps<{
  etapas: EtapaRegistrada[]
  extras: ExtraRegistrado[]
}>()

interface Registro {
  chave: string
  tipo: 'Etapa' | 'Extra'
  data: string
  descricao: string
  /** Linhas de detalhe: "Rótulo: texto". */
  detalhes: { rotulo: string; texto: string }[]
  /** Valores em destaque (cobrado, custo interno). */
  valores: { rotulo: string; valor: string }[]
}

const quantidade = (valor: string, unidade: string) => `${decimalApiParaTexto(valor)} ${rotuloUnidade(unidade)}`.trim()

const registros = computed<Registro[]>(() => {
  const dasEtapas = props.etapas.map((etapa): Registro => {
    const detalhes = []
    if (etapa.servicos.length > 0) {
      detalhes.push({
        rotulo: 'Serviços',
        texto: etapa.servicos.map((s) => `${s.servico.nome} (${quantidade(s.quantidade, s.servico.unidadeMedida)})`).join('; '),
      })
    }
    if (etapa.materiaisCliente.length > 0) {
      detalhes.push({
        rotulo: 'Materiais do cliente',
        texto: etapa.materiaisCliente.map((m) => `${m.nome} (${quantidade(m.quantidade, m.unidadeMedida)})`).join('; '),
      })
    }
    return {
      chave: `etapa-${etapa.id}`,
      tipo: 'Etapa',
      data: etapa.dataRegistro,
      descricao: etapa.descricao,
      detalhes,
      valores: [
        { rotulo: 'Valor medido', valor: formatarMoeda(etapa.valorCobrado) },
        { rotulo: 'Custo interno estimado', valor: formatarMoeda(etapa.custoInternoEstimado) },
      ],
    }
  })

  const dosExtras = props.extras.map((extra): Registro => {
    const detalhes = []
    if (extra.materiais.length > 0) {
      detalhes.push({
        rotulo: 'Materiais',
        texto: extra.materiais.map((m) => `${m.material.nome} (${quantidade(m.quantidade, m.material.unidadeMedida)})`).join('; '),
      })
    }
    if (extra.servicos.length > 0) {
      detalhes.push({
        rotulo: 'Serviços',
        texto: extra.servicos.map((s) => `${s.servico.nome} (${quantidade(s.quantidade, s.servico.unidadeMedida)})`).join('; '),
      })
    }
    if (extra.despesa) detalhes.push({ rotulo: 'Despesa gerada', texto: formatarMoeda(extra.despesa.valorTotal) })
    return {
      chave: `extra-${extra.id}`,
      tipo: 'Extra',
      data: extra.dataRegistro,
      descricao: extra.descricaoJustificativa,
      detalhes,
      valores: [{ rotulo: 'Custo interno estimado', valor: formatarMoeda(extra.custoInternoEstimado) }],
    }
  })

  return [...dasEtapas, ...dosExtras].sort((a, b) => a.data.localeCompare(b.data) || a.chave.localeCompare(b.chave))
})
</script>

<template>
  <details
    v-if="registros.length > 0"
    class="registros"
  >
    <summary class="registros-titulo">
      Registros da obra ({{ registros.length }})
    </summary>
    <ol class="registros-lista">
      <li
        v-for="registro in registros"
        :key="registro.chave"
        class="registro"
      >
        <div class="registro-topo">
          <span
            class="registro-tipo"
            :class="{ 'registro-tipo--extra': registro.tipo === 'Extra' }"
          >{{ registro.tipo }}</span>
          <span class="registro-data">{{ isoParaDataBr(registro.data) }}</span>
        </div>
        <p class="registro-descricao">
          {{ registro.descricao }}
        </p>
        <p
          v-for="detalhe in registro.detalhes"
          :key="detalhe.rotulo"
          class="registro-detalhe"
        >
          <span>{{ detalhe.rotulo }}:</span> {{ detalhe.texto }}
        </p>
        <p class="registro-valores">
          <span
            v-for="valor in registro.valores"
            :key="valor.rotulo"
          >{{ valor.rotulo }}: <strong>{{ valor.valor }}</strong></span>
        </p>
      </li>
    </ol>
  </details>
</template>

<style scoped>
/* Fora do Figma: histórico discreto, recolhido por padrão. */
.registros {
  border: 1px solid var(--fp-cinza-borda);
  border-radius: var(--fp-raio);
}

.registros-titulo {
  padding: 12px 17px;
  color: var(--fp-verde);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.registros-titulo:focus-visible {
  outline: none;
  box-shadow: var(--fp-foco);
  border-radius: var(--fp-raio);
}

.registros-lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0 17px 16px;
  list-style: none;
}

.registro {
  padding: 12px 14px;
  border: 1px solid var(--fp-cinza-borda);
  border-radius: 8px;
  background-color: var(--fp-cinza-fundo);
}

.registro-topo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.registro-tipo {
  padding: 1px 10px;
  border: 1px solid var(--fp-verde-30);
  border-radius: 999px;
  background-color: var(--fp-verde-10);
  color: var(--fp-verde);
  font-size: 11px;
  font-weight: 600;
}

.registro-tipo--extra {
  border-color: #fcd34d;
  background-color: #fef3c7;
  color: #b45309;
}

.registro-data {
  color: var(--fp-cinza-rotulo);
  font-size: 12px;
}

.registro-descricao {
  margin: 8px 0 4px;
  color: #333;
  font-size: 14px;
  font-weight: 500;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.registro-detalhe {
  margin: 2px 0 0;
  color: #4a5565;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.registro-detalhe span {
  color: var(--fp-cinza-rotulo);
}

.registro-valores {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  margin: 8px 0 0;
  color: #6a7282;
  font-size: 12.5px;
}

.registro-valores strong {
  color: #333;
  font-weight: 600;
}
</style>
