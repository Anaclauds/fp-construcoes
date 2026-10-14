<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import maisIcon from '../../assets/icons/icone-mais.svg'
import { useAuth } from '../../composables/useAuth'
import type { FormularioOrcamento } from '../../composables/useFormularioOrcamento'
import { useBuscaClienteAtivo, type ClienteBusca } from '../../composables/useBuscaClienteAtivo'
import { formatarCpfCnpj, formatarTelefone } from '../../utils/formatadores'
import ClienteModalCadastroRapido from '../clientes/ClienteModalCadastroRapido.vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoAutocomplete, { type OpcaoAutocomplete } from '../ui/CampoAutocomplete.vue'
import CampoFormulario from '../ui/CampoFormulario.vue'

const props = defineProps<{
  form: FormularioOrcamento
  /** Modal de edição: mostra também a cidade do cliente escolhido (Figma: "Nome" e "Cidade"). */
  compacto?: boolean
}>()

const { temPermissao } = useAuth()
const podeCadastrarCliente = computed(() => temPermissao('CLIENTES', 'gerenciar'))

const busca = useBuscaClienteAtivo()
const cadastrandoCliente = shallowRef(false)

const opcoes = computed<OpcaoAutocomplete[]>(() =>
  busca.clientes.value.map((cliente) => ({
    valor: String(cliente.id),
    rotulo: cliente.nome,
    detalhe: [`${cliente.cidade}/${cliente.estado}`, formatarCpfCnpj(cliente.cpfCnpj ?? '') || (cliente.telefone ? formatarTelefone(cliente.telefone) : '')]
      .filter(Boolean)
      .join(' · '),
  })),
)

const textoVazio = computed(() => {
  if (busca.semPermissao.value) return 'Sem permissão para listar clientes (é preciso acesso ao módulo Clientes).'
  return busca.erro.value ?? 'Nenhum cliente ativo encontrado.'
})

const idSelecionado = computed({
  get: () => (props.form.cliente.value ? String(props.form.cliente.value.id) : ''),
  set: (id: string) => {
    const cliente = busca.clientes.value.find((c) => String(c.id) === id)
    props.form.cliente.value = cliente ? resumo(cliente) : null
  },
})

const apoio = computed(() => {
  const cliente = props.form.cliente.value
  if (!cliente || props.compacto) return undefined
  return cliente.telefone ? `${cliente.cidade}/${cliente.estado} · ${formatarTelefone(cliente.telefone)}` : `${cliente.cidade}/${cliente.estado}`
})

function resumo(cliente: ClienteBusca) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    cidade: cliente.cidade,
    estado: cliente.estado,
    telefone: cliente.telefone ?? '',
  }
}

/** O cadastro rápido já mostrou o toast: só seleciona o cliente criado e fecha o modal. */
function aoCriarCliente(cliente: ClienteBusca) {
  props.form.cliente.value = resumo(cliente)
  cadastrandoCliente.value = false
}
</script>

<template>
  <div class="cliente-campo">
    <div class="cliente-linha">
      <CampoAutocomplete
        v-model="idSelecionado"
        class="cliente-busca"
        rotulo="Nome:"
        obrigatorio
        icone="lupa"
        limpavel
        placeholder="Buscar cliente existente..."
        :opcoes="opcoes"
        :rotulo-selecionado="form.cliente.value?.nome"
        filtro="servidor"
        :carregando="busca.carregando.value"
        :texto-vazio="textoVazio"
        :erro="form.erros.cliente"
        :apoio="apoio"
        :maxlength="180"
        @abrir="busca.carregarInicial"
        @buscar="busca.buscar"
      />

      <CampoFormulario
        v-if="compacto"
        class="cliente-cidade"
        rotulo="Cidade"
        somente-leitura
        :model-value="form.cliente.value ? `${form.cliente.value.cidade}/${form.cliente.value.estado}` : ''"
      />

      <BotaoFp
        v-if="podeCadastrarCliente"
        class="cliente-novo"
        tamanho="pagina"
        @click="cadastrandoCliente = true"
      >
        <template #icone>
          <img
            :src="maisIcon"
            alt=""
            width="16"
            height="16"
          >
        </template>
        Novo Cliente
      </BotaoFp>
    </div>

    <ClienteModalCadastroRapido
      v-if="cadastrandoCliente"
      @fechar="cadastrandoCliente = false"
      @salvo="aoCriarCliente"
    />
  </div>
</template>

<style scoped>
.cliente-linha {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.cliente-busca {
  flex: 1;
}

.cliente-cidade {
  flex: 1;
}

/* Alinha o botão ao campo: altura do rótulo (21px) + espaço (6px). */
.cliente-novo {
  flex-shrink: 0;
  margin-top: 27px;
  height: var(--campo-altura, 42px);
  padding-inline: 26px;
}

@media (max-width: 700px) {
  .cliente-linha {
    flex-direction: column;
    align-items: stretch;
  }

  .cliente-novo {
    margin-top: 0;
  }
}
</style>
