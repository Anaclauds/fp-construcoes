<script setup lang="ts">
import { rotuloFornecedorVinculado } from '../../utils/fornecedores'
import type { Material } from '../../types/material'
import { formatarMoeda } from '../../utils/formatadores'
import { rotuloUnidade } from '../../utils/materiais'
import BotaoEditarModal from '../estoque/BotaoEditarModal.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import SeloStatus from '../ui/SeloStatus.vue'

defineProps<{
  material: Material
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
    titulo="Detalhes do Material"
    icone="olho"
    largura="700px"
    @fechar="emit('fechar')"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Informações Básicas
        <SeloStatus
          v-if="material.status === 'INATIVO'"
          :status="material.status"
        />
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Código"
          :valor="material.codigo"
        />
        <CampoLeitura
          rotulo="Categoria"
          :valor="material.categoria"
        />
        <CampoLeitura
          rotulo="Unidade de Medida"
          :valor="rotuloUnidade(material.unidadeMedida)"
        />
        <CampoLeitura
          class="largura-total"
          rotulo="Nome do Material"
          :valor="material.nome"
        />
        <CampoLeitura
          class="largura-total texto-longo"
          rotulo="Descrição Detalhada"
          :valor="material.descricao ?? ''"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Preço de Referência
      </h3>
      <dl class="dados dados--dois">
        <CampoLeitura
          rotulo="Preço de Referência"
          :valor="formatarMoeda(material.precoReferencia)"
        />
        <CampoLeitura
          rotulo="Fornecedor"
          :valor="rotuloFornecedorVinculado(material.fornecedorPreferencial)"
        />
      </dl>
    </section>

    <template #rodape-esquerda>
      <BotaoEditarModal
        v-if="podeEditar"
        @click="emit('editar')"
      />
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
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.dados {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.dados--dois {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.largura-total {
  grid-column: 1 / -1;
}

.texto-longo {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

@media (max-width: 600px) {
  .dados,
  .dados--dois {
    grid-template-columns: 1fr;
  }
}
</style>
