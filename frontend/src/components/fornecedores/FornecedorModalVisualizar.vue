<script setup lang="ts">
import type { Fornecedor } from '../../types/fornecedor'
import { formatarCep, formatarCnpj, formatarTelefone } from '../../utils/formatadores'
import BotaoEditarModal from '../estoque/BotaoEditarModal.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import SeloStatus from '../ui/SeloStatus.vue'

defineProps<{
  fornecedor: Fornecedor
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
    titulo="Detalhes do Fornecedor"
    icone="olho"
    largura="780px"
    @fechar="emit('fechar')"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Dados Empresariais
        <SeloStatus
          v-if="fornecedor.status === 'INATIVO'"
          :status="fornecedor.status"
        />
      </h3>
      <dl class="dados">
        <CampoLeitura
          class="duas-colunas"
          rotulo="Razão Social"
          :valor="fornecedor.razaoSocial"
        />
        <CampoLeitura
          rotulo="Nome Fantasia"
          :valor="fornecedor.nomeFantasia"
        />
        <CampoLeitura
          rotulo="CNPJ"
          :valor="formatarCnpj(fornecedor.cnpj)"
        />
        <CampoLeitura
          rotulo="Contato"
          :valor="formatarTelefone(fornecedor.contato)"
        />
        <CampoLeitura
          rotulo="Responsável"
          :valor="fornecedor.responsavel"
        />
        <CampoLeitura
          rotulo="Cargo do Responsável"
          :valor="fornecedor.cargoResponsavel"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Endereço
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="CEP"
          :valor="formatarCep(fornecedor.cep)"
        />
        <CampoLeitura
          rotulo="Cidade"
          :valor="fornecedor.cidade"
        />
        <CampoLeitura
          rotulo="Estado"
          :valor="fornecedor.estado"
        />
        <CampoLeitura
          rotulo="Rua"
          :valor="fornecedor.rua"
        />
        <CampoLeitura
          rotulo="Número"
          :valor="fornecedor.numero"
        />
        <CampoLeitura
          rotulo="Bairro"
          :valor="fornecedor.bairro"
        />
        <CampoLeitura
          v-if="fornecedor.complemento"
          class="largura-total"
          rotulo="Complemento"
          :valor="fornecedor.complemento"
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

.duas-colunas {
  grid-column: span 2;
}

.largura-total {
  grid-column: 1 / -1;
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
