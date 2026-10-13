<script setup lang="ts">
import { computed } from 'vue'
import AcessosPermitidos from '../ui/AcessosPermitidos.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import type { Usuario } from '../../types'
import { formatarCpf } from '../../utils/formatadores'
import { mapaDePermissoes } from '../../utils/permissoes'

const props = defineProps<{
  usuario: Usuario
  /** Exibe o atalho "Editar" (usuário logado pode gerenciar). */
  podeEditar: boolean
}>()

const emit = defineEmits<{
  fechar: []
  editar: []
}>()

const permissoes = computed(() => mapaDePermissoes(props.usuario.permissoes))
</script>

<template>
  <ModalBase
    aberto
    titulo="Dados do Usuário"
    icone="olho"
    largura="680px"
    @fechar="emit('fechar')"
  >
    <h3 class="secao">
      Dados de Acesso
    </h3>

    <dl class="dados">
      <CampoLeitura
        rotulo="Funcionário"
        :valor="usuario.funcionario.nomeCompleto"
      />
      <CampoLeitura
        rotulo="Função"
        :valor="usuario.funcionario.funcao"
      />
      <CampoLeitura
        rotulo="Login (CPF)"
        :valor="formatarCpf(usuario.login)"
      />
    </dl>

    <AcessosPermitidos
      :model-value="permissoes"
      somente-leitura
      altura="380px"
    />

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
.secao {
  margin: 0 0 14px;
  color: var(--fp-verde);
  font-size: 18px;
  font-weight: 500;
}

.dados {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
  margin: 0 0 20px;
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
