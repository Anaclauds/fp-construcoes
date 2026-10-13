<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import AlterarSenhaModal from '../../components/meus-dados/AlterarSenhaModal.vue'
import BotaoFp from '../../components/ui/BotaoFp.vue'
import CabecalhoPagina from '../../components/ui/CabecalhoPagina.vue'
import CampoLeitura from '../../components/ui/CampoLeitura.vue'
import { extrairMensagemErro } from '../../services/api'
import { buscarMeusDados } from '../../services/auth.service'
import type { Funcionario } from '../../types'
import { formatarCpf, formatarTelefone, rotuloLegivel } from '../../utils/formatadores'

const dados = shallowRef<Funcionario | null>(null)
const carregando = shallowRef(true)
const erro = shallowRef<string | null>(null)
const alterandoSenha = shallowRef(false)

async function carregar() {
  carregando.value = true
  erro.value = null
  try {
    dados.value = await buscarMeusDados()
  } catch (falha) {
    erro.value = extrairMensagemErro(falha)
  } finally {
    carregando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <section class="pagina">
    <CabecalhoPagina
      titulo="Meus Dados"
      subtitulo="Consulte seus dados cadastrais e altere sua senha de acesso"
    />

    <p
      v-if="carregando"
      class="mensagem"
      role="status"
    >
      Carregando seus dados...
    </p>

    <div
      v-else-if="erro"
      class="mensagem mensagem--erro"
      role="alert"
    >
      <span>{{ erro }}</span>
      <BotaoFp
        variante="secundario"
        tamanho="pagina"
        @click="carregar"
      >
        Tentar novamente
      </BotaoFp>
    </div>

    <template v-else-if="dados">
      <dl class="dados">
        <CampoLeitura
          class="dados-linha-inteira"
          rotulo="Nome"
          :valor="dados.nomeCompleto"
        />
        <CampoLeitura
          rotulo="Função"
          :valor="rotuloLegivel(dados.funcao)"
        />
        <CampoLeitura
          rotulo="Setor"
          :valor="rotuloLegivel(dados.setorAtuacao)"
        />
        <CampoLeitura
          rotulo="Telefone"
          :valor="formatarTelefone(dados.celular)"
        />
        <CampoLeitura
          rotulo="CPF"
          :valor="formatarCpf(dados.cpf)"
        />
        <CampoLeitura
          rotulo="Contato de emergência"
          :valor="formatarTelefone(dados.contatoEmergencia)"
        />
        <CampoLeitura
          rotulo="Nome do contato de emergência"
          :valor="dados.nomeContatoEmergencia"
        />
      </dl>

      <div>
        <BotaoFp
          variante="secundario"
          tamanho="pagina"
          @click="alterandoSenha = true"
        >
          Alterar Senha
        </BotaoFp>
      </div>
    </template>

    <AlterarSenhaModal
      v-if="alterandoSenha"
      @fechar="alterandoSenha = false"
      @salvo="alterandoSenha = false"
    />
  </section>
</template>

<style scoped>
.pagina {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pagina > :first-child {
  margin-bottom: 8px;
}

/* Figma: bloco de 869px dentro do conteúdo, em duas colunas, com o nome na linha inteira. */
.dados {
  max-width: 870px;
  margin: 0;

  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.dados-linha-inteira {
  grid-column: 1 / -1;
}

.mensagem {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.mensagem--erro {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--fp-vermelho-escuro);
}

@media (max-width: 700px) {
  .dados {
    grid-template-columns: 1fr;
  }
}
</style>
