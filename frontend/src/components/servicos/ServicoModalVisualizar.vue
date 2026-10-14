<script setup lang="ts">
import type { Servico } from '../../types/servico'
import { formatarMoeda } from '../../utils/formatadores'
import { ROTULO_TIPO_ORCAMENTO, rotuloUnidade } from '../../utils/orcamentos'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'

defineProps<{
  servico: Servico
  /** Exibe o atalho "Editar" (usuário logado pode gerenciar). */
  podeEditar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  editar: []
}>()
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes do Serviço"
    icone="olho"
    largura="600px"
    @fechar="emit('fechar')"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Informações Básicas
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Nome do Serviço"
          :valor="servico.nome"
        />
        <CampoLeitura
          rotulo="Categoria"
          :valor="ROTULO_TIPO_ORCAMENTO[servico.categoria]"
        />
        <CampoLeitura
          class="largura-total"
          rotulo="Descrição do Serviço"
          :valor="servico.descricao ?? ''"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Precificação
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Valor Unitário"
          :valor="formatarMoeda(servico.valorReferencia)"
        />
        <CampoLeitura
          rotulo="Unidade de Medida"
          :valor="rotuloUnidade(servico.unidadeMedida)"
        />
      </dl>
      <p class="nota">
        * O valor é utilizado como base nos orçamentos e pode ser ajustado em cada item.
      </p>
    </section>

    <template #rodape-esquerda>
      <BotaoFp
        v-if="podeEditar"
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
.secao + .secao {
  margin-top: 22px;
}

.secao-titulo {
  margin: 0 0 12px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.dados {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.largura-total {
  grid-column: 1 / -1;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.nota {
  margin: 10px 0 0;
  color: #717182;
  font-size: 12.5px;
}

.icone-lapis {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 600px) {
  .dados {
    grid-template-columns: 1fr;
  }
}
</style>
