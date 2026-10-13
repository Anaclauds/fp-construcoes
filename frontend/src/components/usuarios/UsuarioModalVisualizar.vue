<script setup lang="ts">
import { computed } from 'vue'
import AcessosPermitidos from '../ui/AcessosPermitidos.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoLeitura from '../ui/CampoLeitura.vue'
import ModalBase from '../ui/ModalBase.vue'
import type { Usuario } from '../../types'
import { formatarCpf, formatarDataHoraIso, rotuloLegivel } from '../../utils/formatadores'
import { funcionarioInativo, statusDoUsuario } from '../../utils/usuarios'
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

const ultimoAcesso = computed(() => formatarDataHoraIso(props.usuario.ultimoAcesso) || 'Nunca acessou')
const rotuloStatusUsuario = computed(() =>
  funcionarioInativo(props.usuario)
    ? 'Inativo (funcionário inativo)'
    : statusDoUsuario(props.usuario) === 'ATIVO'
      ? 'Ativo'
      : 'Inativo',
)
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

    <p
      v-if="funcionarioInativo(usuario)"
      class="aviso-inativo"
      role="status"
    >
      O funcionário deste usuário está inativo, então o usuário também aparece como inativo. Reative o
      funcionário primeiro para liberar o acesso.
    </p>

    <dl class="dados">
      <CampoLeitura
        rotulo="Funcionário"
        :valor="usuario.funcionario.nomeCompleto"
      />
      <CampoLeitura
        rotulo="Função"
        :valor="rotuloLegivel(usuario.funcionario.funcao)"
      />
      <CampoLeitura
        rotulo="Login (CPF)"
        :valor="formatarCpf(usuario.login)"
      />
      <CampoLeitura
        rotulo="Último acesso"
        :valor="ultimoAcesso"
      />
      <CampoLeitura
        rotulo="Status"
        :valor="rotuloStatusUsuario"
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

.aviso-inativo {
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid #fcd34d;
  border-radius: var(--fp-raio);
  background-color: #fffbeb;

  color: #92400e;
  font-size: 13px;
  line-height: 1.45;
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
