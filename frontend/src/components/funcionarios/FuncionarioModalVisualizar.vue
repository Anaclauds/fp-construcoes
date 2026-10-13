<script setup lang="ts">
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import type { Funcionario } from '../../types'
import {
  formatarCep,
  formatarCpf,
  formatarMoeda,
  formatarTelefone,
  isoParaDataBr,
  rotuloLegivel,
} from '../../utils/formatadores'

defineProps<{
  funcionario: Funcionario
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
    titulo="Informações do Funcionário"
    icone="olho"
    largura="640px"
    @fechar="emit('fechar')"
  >
    <section class="secao">
      <h3 class="secao-titulo">
        Dados Pessoais
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Nome completo"
          :valor="funcionario.nomeCompleto"
        />
        <CampoLeitura
          rotulo="Apelido"
          :valor="funcionario.apelido ?? ''"
        />
        <CampoLeitura
          rotulo="CPF"
          :valor="formatarCpf(funcionario.cpf)"
        />
        <CampoLeitura
          rotulo="Data de Nascimento"
          :valor="isoParaDataBr(funcionario.dataNascimento)"
        />
        <CampoLeitura
          rotulo="Sexo"
          :valor="rotuloLegivel(funcionario.sexo)"
        />
        <CampoLeitura
          rotulo="Celular"
          :valor="formatarTelefone(funcionario.celular)"
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
          :valor="formatarCep(funcionario.cep)"
        />
        <CampoLeitura
          rotulo="Cidade"
          :valor="funcionario.cidade"
        />
        <CampoLeitura
          rotulo="Estado"
          :valor="funcionario.estado"
        />
        <CampoLeitura
          rotulo="Rua"
          :valor="funcionario.rua"
        />
        <CampoLeitura
          rotulo="Número"
          :valor="funcionario.numero"
        />
        <CampoLeitura
          rotulo="Bairro"
          :valor="funcionario.bairro"
        />
        <CampoLeitura
          v-if="funcionario.complemento"
          class="largura-total"
          rotulo="Complemento"
          :valor="funcionario.complemento"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Informações de Trabalho
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Função"
          :valor="rotuloLegivel(funcionario.funcao)"
        />
        <CampoLeitura
          rotulo="Setor de Atuação"
          :valor="rotuloLegivel(funcionario.setorAtuacao)"
        />
        <CampoLeitura
          rotulo="Tipo de Contrato"
          :valor="rotuloLegivel(funcionario.tipoContrato)"
        />
        <CampoLeitura
          rotulo="Salário"
          :valor="formatarMoeda(funcionario.salario)"
        />
        <CampoLeitura
          rotulo="Data de Contratação"
          :valor="isoParaDataBr(funcionario.dataContratacao)"
        />
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Contato de Emergência
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Nome do Contato"
          :valor="funcionario.nomeContatoEmergencia"
        />
        <CampoLeitura
          rotulo="Telefone"
          :valor="formatarTelefone(funcionario.contatoEmergencia)"
        />
        <CampoLeitura
          rotulo="Grau de Vínculo"
          :valor="rotuloLegivel(funcionario.grauVinculo)"
        />
      </dl>
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.largura-total {
  grid-column: 1 / -1;
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
