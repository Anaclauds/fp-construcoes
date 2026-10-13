import { computed, shallowRef, watch, type Ref } from 'vue'
import type { Frequencia, RegistroFrequenciaPayload, StatusFrequencia } from '../types'
import { exigeObservacao, paraLinhaFolha, type LinhaFolha } from '../utils/frequencia'

interface Alteracao {
  status?: StatusFrequencia | null
  observacao?: string
}

/**
 * Rascunho da folha do dia: guarda só o que o usuário mudou sobre os registros carregados.
 * Nada vai para a API até o "Salvar Frequência".
 */
export function useEdicaoFolha(registros: Ref<Frequencia[]>) {
  const alteracoes = shallowRef<Record<number, Alteracao>>({})

  const linhas = computed<LinhaFolha[]>(() =>
    registros.value.map((registro) => {
      const base = paraLinhaFolha(registro)
      const alteracao = alteracoes.value[registro.funcionarioId]
      if (!alteracao) return base
      return {
        ...base,
        status: alteracao.status !== undefined ? alteracao.status : base.status,
        observacao: alteracao.observacao !== undefined ? alteracao.observacao : base.observacao,
      }
    }),
  )

  const originais = computed(() => new Map(registros.value.map((r) => [r.funcionarioId, paraLinhaFolha(r)])))

  /** Linhas cujo status ou observação diferem do que está salvo. */
  const linhasAlteradas = computed(() =>
    linhas.value.filter((linha) => {
      const original = originais.value.get(linha.funcionarioId)
      return !original || original.status !== linha.status || original.observacao.trim() !== linha.observacao.trim()
    }),
  )

  const houveAlteracoes = computed(() => linhasAlteradas.value.length > 0)

  /** Linhas com Meio Período / Falta Justificada e sem observação. */
  const pendentes = computed(() => linhas.value.filter((l) => exigeObservacao(l.status) && l.observacao.trim() === ''))
  const idsPendentes = computed(() => new Set(pendentes.value.map((l) => l.funcionarioId)))

  function atualizar(funcionarioId: number, parcial: Alteracao) {
    alteracoes.value = {
      ...alteracoes.value,
      [funcionarioId]: { ...alteracoes.value[funcionarioId], ...parcial },
    }
  }

  function definirStatus(funcionarioId: number, status: StatusFrequencia) {
    atualizar(funcionarioId, { status })
  }

  function definirObservacao(funcionarioId: number, observacao: string) {
    atualizar(funcionarioId, { observacao })
  }

  /** Só as linhas alteradas e com status escolhido (a API não aceita "sem status"); observação sem espaços nas pontas. */
  function paraPayload(): RegistroFrequenciaPayload[] {
    return linhasAlteradas.value.flatMap((linha) => {
      if (linha.status === null) return []
      const observacao = linha.observacao.trim()
      // Nunca vai '': com texto, envia o texto; apagada, envia null para limpar a que estava salva
      // (omitir manteria a antiga); sem nenhuma, o campo nem é enviado.
      const tinhaSalva = !!originais.value.get(linha.funcionarioId)?.observacao.trim()
      const campoObservacao = observacao !== '' ? { observacao } : tinhaSalva ? { observacao: null } : {}
      return [{ funcionarioId: linha.funcionarioId, status: linha.status, ...campoObservacao }]
    })
  }

  function descartar() {
    alteracoes.value = {}
  }

  // Folha recarregada (outra data, ou depois de salvar): o rascunho não vale mais.
  watch(registros, descartar)

  return { linhas, houveAlteracoes, pendentes, idsPendentes, definirStatus, definirObservacao, paraPayload, descartar }
}
