<script setup lang="ts">
import { computed, reactive } from 'vue'
import BotaoFp from '../ui/BotaoFp.vue'
import CampoData from '../ui/CampoData.vue'
import CampoFormulario, { type OpcaoCampo } from '../ui/CampoFormulario.vue'
import type { FuncionarioOpcao } from '../../composables/useTodosFuncionarios'
import type { StatusFrequencia } from '../../types'
import { dataBrParaIso } from '../../utils/formatadores'
import { ROTULO_STATUS, STATUS_FREQUENCIA } from '../../utils/frequencia'
import { dataBrValida } from '../../utils/validacao'

export interface FiltrosEscolhidos {
  funcionarioId: number
  /** YYYY-MM-DD */
  dataInicial: string
  dataFinal: string
  status: StatusFrequencia | null
}

const props = defineProps<{
  funcionarios: FuncionarioOpcao[]
  carregandoFuncionarios?: boolean
  gerando?: boolean
  /** Erro devolvido ao gerar (ex.: 400 da API). */
  erroGeral?: string | null
}>()

const emit = defineEmits<{
  gerar: [filtros: FiltrosEscolhidos]
  cancelar: []
}>()

const form = reactive({ funcionarioId: '', dataInicial: '', dataFinal: '', status: '' })
const erros = reactive<Partial<Record<keyof typeof form, string>>>({})

const opcoesFuncionario = computed<OpcaoCampo[]>(() =>
  props.funcionarios.map((f) => ({
    valor: String(f.id),
    rotulo: `${f.nomeCompleto} — ${f.funcao}${f.status === 'INATIVO' ? ' (Inativo)' : ''}`,
  })),
)

const opcoesStatus: OpcaoCampo[] = STATUS_FREQUENCIA.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s] }))

function validar(): boolean {
  erros.funcionarioId = form.funcionarioId ? undefined : 'Selecione o funcionário.'

  erros.dataInicial = !form.dataInicial
    ? 'Informe a data inicial.'
    : !dataBrValida(form.dataInicial)
      ? 'Data inicial inválida.'
      : undefined

  erros.dataFinal = !form.dataFinal
    ? 'Informe a data final.'
    : !dataBrValida(form.dataFinal)
      ? 'Data final inválida.'
      : undefined

  if (!erros.dataInicial && !erros.dataFinal && dataBrParaIso(form.dataInicial) > dataBrParaIso(form.dataFinal)) {
    erros.dataFinal = 'A data final deve ser igual ou posterior à data inicial.'
  }

  return !erros.funcionarioId && !erros.dataInicial && !erros.dataFinal
}

function gerar() {
  if (!validar()) return
  emit('gerar', {
    funcionarioId: Number(form.funcionarioId),
    dataInicial: dataBrParaIso(form.dataInicial),
    dataFinal: dataBrParaIso(form.dataFinal),
    status: (form.status || null) as StatusFrequencia | null,
  })
}
</script>

<template>
  <form
    class="filtros"
    novalidate
    @submit.prevent="gerar"
  >
    <div class="filtros-grade">
      <CampoFormulario
        v-model="form.funcionarioId"
        tipo="select"
        rotulo="Funcionário:"
        obrigatorio
        :placeholder="carregandoFuncionarios ? 'Carregando funcionários...' : 'Selecione o funcionário'"
        :opcoes="opcoesFuncionario"
        :erro="erros.funcionarioId"
      />
      <CampoData
        v-model="form.dataInicial"
        rotulo="Data Inicial:"
        obrigatorio
        :erro="erros.dataInicial"
      />
      <CampoData
        v-model="form.dataFinal"
        rotulo="Data Final:"
        obrigatorio
        :erro="erros.dataFinal"
      />
      <CampoFormulario
        v-model="form.status"
        tipo="select"
        rotulo="Status:"
        dica="(opcional)"
        placeholder="Selecione o status"
        :opcoes="opcoesStatus"
      />
    </div>

    <p
      v-if="erroGeral"
      class="filtros-erro"
      role="alert"
    >
      {{ erroGeral }}
    </p>

    <div class="filtros-rodape">
      <BotaoFp
        variante="secundario"
        tamanho="formulario"
        :desabilitado="gerando"
        @click="emit('cancelar')"
      >
        Cancelar
      </BotaoFp>
      <BotaoFp
        type="submit"
        tamanho="formulario"
        :carregando="gerando"
      >
        Gerar Relatório
      </BotaoFp>
    </div>
  </form>
</template>

<style scoped>
.filtros {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filtros-grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px 32px;
}

.filtros-erro {
  margin: 0;
  color: var(--fp-vermelho-escuro);
  font-size: 14px;
  font-weight: 500;
}

/* Botões no pé da tela, como nos formulários de cadastro. */
.filtros-rodape {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding-bottom: 20px;
}

@media (max-width: 900px) {
  .filtros-grade {
    grid-template-columns: 1fr;
  }
}
</style>
