import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro, type MaterialSemSaldo } from '../services/api'
import type { CobrancaProjeto, IniciarProjetoPayload, ProjetoResumo } from '../types/projeto'
import { hojeIso } from '../utils/datas'
import { dataBrParaIso, isoParaDataBr, paraCentavos } from '../utils/formatadores'
import { duracaoEmDias, ehEstoqueInsuficiente, mensagemProjeto } from '../utils/projetos'
import { dataBrValida } from '../utils/validacao'
import { ANO_MINIMO_DATA_PROJETO } from '../utils/projetos'
import { useCobrancaProjeto } from './useCobrancaProjeto'

export interface CamposIniciar {
  dataInicio: string
  previsaoConclusao: string
}

export type ErrosIniciar = Partial<Record<keyof CamposIniciar, string>>

/**
 * Formulário "Iniciar Projeto". Construção Civil tem uma etapa só (cronograma; a cobrança vem por medição);
 * Serralheria e Calhas têm a etapa de cronograma e a de cobrança (condição da cobrança FINAL sobre o saldo do orçamento:
 * valor total menos as entradas já cobradas, como o `iniciar` do servidor; se as entradas cobrem tudo, não há cobrança).
 * Data de início nasce com a previsão de início e a previsão de conclusão com a cadastrada (ambas editáveis).
 *
 * Regras de negócio mais restritas que a API, mantidas de propósito: a data de início real não pode ser futura (a API
 * aceita) e a previsão de conclusão é obrigatória em Construção Civil (a API aceita sem ela).
 */
export function useFormularioIniciarProjeto(projeto: ProjetoResumo) {
  const construcaoCivil = projeto.orcamento.tipo === 'CONSTRUCAO_CIVIL'

  // A obra começa hoje ou antes: previsão no futuro não vira sugestão (o início real não pode ser futuro).
  const sugestaoInicio = isoParaDataBr(projeto.previsaoInicio && projeto.previsaoInicio.slice(0, 10) <= hojeIso() ? projeto.previsaoInicio : hojeIso())
  const sugestaoConclusao = projeto.previsaoConclusao ? isoParaDataBr(projeto.previsaoConclusao) : ''

  const campos = reactive<CamposIniciar>({ dataInicio: sugestaoInicio, previsaoConclusao: sugestaoConclusao })
  const erros = reactive<ErrosIniciar>({})
  const erroGeral = shallowRef<string | null>(null)
  const erroEstoque = shallowRef(false)
  /**
   * Materiais sem saldo para reservar o estoque: conferidos ao abrir (`estoqueSuficiente === false` do detalhe) e
   * também vindos do 400 de estoque.
   */
  const materiaisSemSaldo = shallowRef<MaterialSemSaldo[]>([])
  /** Falta saldo conferida ANTES de enviar: o botão de confirmar fica desabilitado até regularizar o estoque. */
  const semEstoque = shallowRef(false)
  /** O backend disse que o projeto mudou (já iniciado...): a lista precisa recarregar. */
  const desatualizado = shallowRef(false)

  /** Entradas (cobranças ENTRADA vigentes do projeto) já lançadas: o servidor cobra só o restante. Vem do detalhe do projeto. */
  const entradasCentavos = shallowRef(0)
  /** Valor da cobrança FINAL: total do orçamento menos as entradas (nunca negativo). */
  const valorBase = computed(() => Math.max(0, paraCentavos(projeto.orcamento.valorTotal) - entradasCentavos.value))
  /** Serralheria/Calhas só cobram se ainda restar saldo depois das entradas (senão o servidor não cria cobrança). */
  const geraCobranca = computed(() => !construcaoCivil && valorBase.value > 0)

  function definirEntradas(cobrancas: CobrancaProjeto[]) {
    entradasCentavos.value = cobrancas
      .filter((c) => c.etapaId === null && c.tipo === 'ENTRADA' && c.status !== 'CANCELADO')
      .reduce((total, c) => total + paraCentavos(c.valorTotal), 0)
  }

  const cobranca = useCobrancaProjeto(valorBase, { projetoId: projeto.id })

  for (const chave of ['dataInicio', 'previsaoConclusao'] as const) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
        if (erros.previsaoConclusao && chave === 'dataInicio') erros.previsaoConclusao = undefined
      },
    )
  }

  // Qualquer alteração depois de um erro da API (ex.: estoque insuficiente) tira o aviso da tela.
  watch(
    () => [campos.dataInicio, campos.previsaoConclusao, JSON.stringify(cobranca.campos)],
    () => {
      erroGeral.value = null
      erroEstoque.value = false
      if (!semEstoque.value) materiaisSemSaldo.value = []
    },
  )

  /** Duração em dias corridos (início e fim contam); null enquanto as datas não permitirem calcular. */
  const duracao = computed(() => {
    if (!dataBrValida(campos.dataInicio, ANO_MINIMO_DATA_PROJETO) || !dataBrValida(campos.previsaoConclusao, ANO_MINIMO_DATA_PROJETO)) return null
    return duracaoEmDias(dataBrParaIso(campos.dataInicio), dataBrParaIso(campos.previsaoConclusao))
  })

  const alterado = computed(
    () =>
      campos.dataInicio !== sugestaoInicio ||
      campos.previsaoConclusao !== sugestaoConclusao ||
      (geraCobranca.value && cobranca.alterado.value),
  )

  /** Valida o cronograma (etapa 1). */
  function validarCronograma(): boolean {
    erroGeral.value = null
    erroEstoque.value = false

    if (campos.dataInicio === '') erros.dataInicio = 'Informe a data de início da obra.'
    else if (!dataBrValida(campos.dataInicio, ANO_MINIMO_DATA_PROJETO)) erros.dataInicio = `Data inválida. Use DD/MM/AAAA (ano a partir de ${ANO_MINIMO_DATA_PROJETO}).`
    else if (dataBrParaIso(campos.dataInicio) > hojeIso()) erros.dataInicio = 'A data de início real não pode ser futura.'
    else erros.dataInicio = undefined

    if (campos.previsaoConclusao === '') {
      erros.previsaoConclusao = construcaoCivil ? 'Informe a previsão de conclusão.' : undefined
    } else if (!dataBrValida(campos.previsaoConclusao, ANO_MINIMO_DATA_PROJETO)) {
      erros.previsaoConclusao = `Data inválida. Use DD/MM/AAAA (ano a partir de ${ANO_MINIMO_DATA_PROJETO}).`
    } else if (!erros.dataInicio && dataBrParaIso(campos.previsaoConclusao) < dataBrParaIso(campos.dataInicio)) {
      erros.previsaoConclusao = 'A previsão de conclusão não pode ser anterior ao início.'
    } else erros.previsaoConclusao = undefined

    return !erros.dataInicio && !erros.previsaoConclusao
  }

  function validarCobranca(): boolean {
    erroGeral.value = null
    erroEstoque.value = false
    return cobranca.validar()
  }

  /** Corpo do PATCH /iniciar (assume campos válidos); datas em YYYY-MM-DD. */
  function paraPayload(): IniciarProjetoPayload {
    return {
      dataInicio: dataBrParaIso(campos.dataInicio),
      ...(campos.previsaoConclusao ? { previsaoConclusao: dataBrParaIso(campos.previsaoConclusao) } : {}),
      ...(geraCobranca.value ? cobranca.paraPayload() : {}),
    }
  }

  /** Falta de estoque, projeto já iniciado, data inválida... viram mensagem no próprio modal. */
  function tratarErroApi(erro: unknown): 'cronograma' | 'cobranca' {
    const { mensagem, materiais, codigo, status } = extrairErro(erro)
    const texto = mensagemProjeto(mensagem, codigo)
    erroGeral.value = texto
    erroEstoque.value = ehEstoqueInsuficiente(codigo)
    materiaisSemSaldo.value = materiais
    // Já iniciado (409) ou removido (404): a lista está desatualizada.
    if (codigo === 'PROJETO_STATUS_INVALIDO' || status === 404) desatualizado.value = true
    if (codigo === 'PROJETOS_INICIAR_BADREQUEST_01') {
      erros.previsaoConclusao = texto
      return 'cronograma'
    }
    return 'cobranca'
  }

  return {
    construcaoCivil,
    geraCobranca,
    entradasCentavos,
    valorBase,
    definirEntradas,
    sugestaoInicio,
    campos,
    erros,
    erroGeral,
    erroEstoque,
    materiaisSemSaldo,
    semEstoque,
    desatualizado,
    duracao,
    cobranca,
    alterado,
    validarCronograma,
    validarCobranca,
    paraPayload,
    tratarErroApi,
  }
}
