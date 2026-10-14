<script setup lang="ts">
import type { Equipamento } from '../../types/equipamento'
import { rotuloTipoEquipamento } from '../../utils/equipamentos'
import { formatarMoeda, isoParaDataBr } from '../../utils/formatadores'
import BotaoEditarModal from '../estoque/BotaoEditarModal.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import SeloStatus from '../ui/SeloStatus.vue'

defineProps<{
  equipamento: Equipamento
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
    titulo="Detalhes do Equipamento"
    icone="olho"
    largura="760px"
    @fechar="emit('fechar')"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Informações Básicas
        <SeloStatus
          v-if="equipamento.status === 'INATIVO'"
          :status="equipamento.status"
        />
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Código"
          :valor="equipamento.codigoPatrimonial"
        />
        <CampoLeitura
          class="duas-colunas"
          rotulo="Nome"
          :valor="equipamento.nome"
        />
        <CampoLeitura
          rotulo="Tipo"
          :valor="rotuloTipoEquipamento(equipamento.tipo)"
        />
        <CampoLeitura
          rotulo="Marca"
          :valor="equipamento.marca"
        />
        <CampoLeitura
          rotulo="Modelo"
          :valor="equipamento.modelo ?? ''"
        />
        <CampoLeitura
          class="largura-total texto-longo"
          rotulo="Observações"
          :valor="equipamento.observacoes ?? ''"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Dados de Aquisição
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Data de Aquisição"
          :valor="equipamento.dataAquisicao ? isoParaDataBr(equipamento.dataAquisicao) : ''"
        />
        <CampoLeitura
          rotulo="Valor de Aquisição"
          :valor="equipamento.valorAquisicao === null ? '' : formatarMoeda(equipamento.valorAquisicao)"
        />
        <CampoLeitura
          rotulo="Fornecedor"
          :valor="equipamento.fornecedor?.nomeFantasia ?? ''"
        />
      </dl>
      <p class="nota">
        * Informações opcionais para controle patrimonial.
      </p>
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

.duas-colunas {
  grid-column: span 2;
}

.largura-total {
  grid-column: 1 / -1;
}

.texto-longo {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.nota {
  margin: 10px 0 0;
  color: #717182;
  font-size: 12.5px;
}

@media (max-width: 600px) {
  .dados {
    grid-template-columns: 1fr;
  }

  .duas-colunas {
    grid-column: auto;
  }
}
</style>
