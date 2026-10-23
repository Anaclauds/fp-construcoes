import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro, type MaterialSemSaldo } from '../services/api'
import type { IniciarProjetoPayload, ProjetoResumo } from '../types/projeto'
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
 * Serralheria e Calhas têm a etapa de cronograma e a de cobrança (condição da cobrança FINAL sobre o valor do orçamento).
 * Data de início nasce com a previsão de início e a previsão de conclusão com a cadastrada (ambas editáveis).
 */
export function useFormularioIniciarProjeto(projeto: ProjetoResumo) {
  const construcaoCivil = projeto.orcamento.tipo === 'CONSTRUCAO_CIVIL'
  const geraCobranca = !construcaoCivil

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

  const valorBase = computed(() => paraCentavos(projeto.orcamento.valorTotal))
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
      (geraCobranca && cobranca.alterado.value),
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
      ...(geraCobranca ? cobranca.paraPayload() : {}),
    }
  }

  /** Falta de estoque, projeto já iniciado, data inválida... viram mensagem no próprio modal. */
  function tratarErroApi(erro: unknown): 'cronograma' | 'cobranca' {
    const { mensagem, materiais, codigo, status } = extrairErro(erro)
    const texto = mensagemProjeto(mensagem)
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
