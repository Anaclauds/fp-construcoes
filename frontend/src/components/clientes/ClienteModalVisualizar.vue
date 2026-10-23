<script setup lang="ts">
import { computed } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import type { Cliente } from '../../types'
import {
  formatarCep,
  formatarCnpj,
  formatarCpf,
  formatarTelefone,
  isoParaDataBr,
  rotuloLegivel,
} from '../../utils/formatadores'

const props = defineProps<{
  cliente: Cliente
  /** Exibe o atalho "Editar" (usuário logado pode gerenciar). */
  podeEditar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  editar: []
}>()

const rotuloTipo = computed(() => {
  if (props.cliente.tipo === 'PF') return 'Pessoa Física (PF)'
  if (props.cliente.tipo === 'PJ') return 'Pessoa Jurídica (PJ)'
  return 'Cadastro rápido (sem tipo)'
})

const tituloDados = computed(() => {
  if (props.cliente.tipo === 'PJ') return 'Dados Empresariais'
  return props.cliente.tipo === 'PF' ? 'Dados Pessoais' : 'Dados do Cliente'
})
</script>

<template>
  <ModalBase
    aberto
    titulo="Detalhes do Cliente"
    icone="olho"
    largura="680px"
    @fechar="emit('fechar')"
  >
    <div
      v-if="cliente.tipo === null"
      class="aviso-rapido"
      role="status"
    >
      <div class="aviso-rapido-texto">
        <strong>Cadastro rápido — complete os dados</strong>
        <span>Este cliente tem só nome, telefone e cidade. Faltam tipo, documento e endereço completo.</span>
      </div>
      <BotaoFp
        v-if="podeEditar"
        tamanho="pagina"
        @click="emit('editar')"
      >
        Editar
      </BotaoFp>
    </div>

    <section class="secao">
      <h3 class="secao-titulo">
        {{ tituloDados }}
      </h3>
      <dl class="dados">
        <CampoLeitura
          rotulo="Tipo"
          :valor="rotuloTipo"
        />

        <template v-if="cliente.tipo === 'PJ'">
          <CampoLeitura
            rotulo="Razão Social"
            :valor="cliente.razaoSocial ?? cliente.nome"
          />
          <CampoLeitura
            rotulo="Nome Fantasia"
            :valor="cliente.nomeFantasia ?? ''"
          />
          <CampoLeitura
            rotulo="CNPJ"
            :valor="formatarCnpj(cliente.cpfCnpj ?? '')"
          />
          <CampoLeitura
            rotulo="Celular"
            :valor="formatarTelefone(cliente.telefone)"
          />
          <CampoLeitura
            rotulo="Responsável"
            :valor="cliente.responsavel ?? ''"
          />
          <CampoLeitura
            rotulo="Cargo do Responsável"
            :valor="rotuloLegivel(cliente.cargoResponsavel)"
          />
          <CampoLeitura
            rotulo="E-mail"
            :valor="cliente.email ?? ''"
          />
        </template>

        <template v-else>
          <CampoLeitura
            :rotulo="cliente.tipo === 'PF' ? 'Nome completo' : 'Nome'"
            :valor="cliente.nome"
          />
          <template v-if="cliente.tipo === 'PF'">
            <CampoLeitura
              rotulo="Apelido"
              :valor="cliente.apelido ?? ''"
            />
            <CampoLeitura
              rotulo="CPF"
              :valor="formatarCpf(cliente.cpfCnpj ?? '')"
            />
            <CampoLeitura
              rotulo="Data de Nascimento"
              :valor="cliente.dataNascimento ? isoParaDataBr(cliente.dataNascimento) : ''"
            />
            <CampoLeitura
              rotulo="Sexo"
              :valor="rotuloLegivel(cliente.sexo)"
            />
          </template>
          <CampoLeitura
            :rotulo="cliente.tipo === 'PF' ? 'Celular' : 'Telefone'"
            :valor="formatarTelefone(cliente.telefone)"
          />
          <CampoLeitura
            v-if="cliente.email"
            rotulo="E-mail"
            :valor="cliente.email"
          />
        </template>
      </dl>
    </section>

    <section class="secao">
      <h3 class="secao-titulo">
        Endereço
      </h3>
      <dl class="dados">
        <CampoLeitura
          v-if="cliente.cep"
          rotulo="CEP"
          :valor="formatarCep(cliente.cep)"
        />
        <CampoLeitura
          rotulo="Cidade"
          :valor="cliente.cidade"
        />
        <CampoLeitura
          rotulo="Estado"
          :valor="cliente.estado"
        />
        <template v-if="cliente.tipo !== null">
          <CampoLeitura
            rotulo="Rua"
            :valor="cliente.rua ?? ''"
          />
          <CampoLeitura
            rotulo="Número"
            :valor="cliente.numero ?? ''"
          />
          <CampoLeitura
            rotulo="Bairro"
            :valor="cliente.bairro ?? ''"
          />
          <CampoLeitura
            v-if="cliente.complemento"
            class="largura-total"
            rotulo="Complemento"
            :valor="cliente.complemento"
          />
        </template>
      </dl>
    </section>

    <template #rodape-esquerda>
      <BotaoFp
        v-if="podeEditar && cliente.tipo !== null"
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
.aviso-rapido {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  margin-bottom: 22px;
  padding: 14px 18px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fef3c7;
  color: #b45309;
}

.aviso-rapido-texto {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
}

.aviso-rapido-texto strong {
  font-size: 15px;
  font-weight: 600;
}

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

  .aviso-rapido {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
