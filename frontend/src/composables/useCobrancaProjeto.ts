import { computed, onScopeDispose, reactive, shallowRef, watch, type Ref } from 'vue'
import { simularCobrancaDoProjeto } from '../services/projetos.service'
import type { FormaPagamento } from '../types/cobranca'
import type { CondicaoCobrancaPayload, ModalidadeCobrancaProjeto, SimularCobrancaPayload } from '../types/projeto'
import { useFormasPagamentoProjeto } from './useFormasPagamentoProjeto'
import { dataBrParaIso } from '../utils/formatadores'
import { decimalApiParaCentavos } from '../utils/orcamentos'
import {
  calcularCobranca,
  type CobrancaCalculada,
  formaAceitaAcrescimo,
  formaValidaNaModalidade,
  opcoesFormaPagamento,
  ANO_MINIMO_DATA_PROJETO,
  MAXIMO_PARCELAS,
  MINIMO_PARCELAS,
  percentualDeTexto,
} from '../utils/projetos'
import { dataBrValida } from '../utils/validacao'

export interface CamposCobrancaProjeto {
  modalidade: ModalidadeCobrancaProjeto
  parcelas: string
  /** DD/MM/AAAA. */
  primeiroVencimento: string
  acrescimo: string
  desconto: string
  forma: string
}

export type ErrosCobrancaProjeto = Partial<Record<keyof CamposCobrancaProjeto | 'valor', string>>

const CHAVES: (keyof CamposCobrancaProjeto)[] = ['modalidade', 'parcelas', 'primeiroVencimento', 'acrescimo', 'desconto', 'forma']

const PARCELAS_PADRAO = '2'
const ATRASO_SIMULACAO_MS = 700

/** Para onde a prévia do servidor aponta: `valorCobrado` ausente simula o saldo do início (descontando entradas prévias). */
export interface SimulacaoServidor {
  projetoId: number
  /** Valor bruto da medição, em centavos (etapa). */
  valorCobradoCentavos?: Ref<number>
}

function camposIniciais(): CamposCobrancaProjeto {
  return { modalidade: 'A_VISTA', parcelas: PARCELAS_PADRAO, primeiroVencimento: '', acrescimo: '', desconto: '', forma: '' }
}

/**
 * Condição de cobrança de um projeto (iniciar Serralheria/Calhas e registrar etapa de Construção Civil):
 * À Vista ou Parcelado, parcelas, 1º vencimento, acréscimo, desconto e forma de pagamento, com o resumo
 * calculado igual ao backend (ver `calcularCobranca`). `baseCentavos` é o valor sobre o qual a cobrança incide.
 * Com `servidor`, o resumo passa a mostrar a prévia de `POST /projetos/:id/cobranca/simular` (debounce, resposta antiga
 * descartada) assim que ela chega: ela já considera, por exemplo, as entradas prévias do projeto que a conta local ignora.
 */
export function useCobrancaProjeto(baseCentavos: Ref<number>, servidor?: SimulacaoServidor) {
  const campos = reactive<CamposCobrancaProjeto>(camposIniciais())
  const erros = reactive<ErrosCobrancaProjeto>({})

  const parcelado = computed(() => campos.modalidade === 'PARCELADO_AUTOMATICO')
  const formasApi = useFormasPagamentoProjeto()
  const formaValida = (forma: string, modalidade: ModalidadeCobrancaProjeto) => formaValidaNaModalidade(formasApi.formas.value, forma, modalidade)
  const opcoesForma = computed(() => opcoesFormaPagamento(formasApi.formas.value, campos.modalidade))
  const acrescimoHabilitado = computed(() => formaAceitaAcrescimo(formasApi.formas.value, campos.modalidade, campos.forma))

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
        if (erros.valor) erros.valor = undefined
      },
    )
  }

  // Trocar a modalidade limpa a forma que ela não aceita (a lista de formas por modalidade vem da API).
  watch(
    () => campos.modalidade,
    (modalidade) => {
      if (campos.forma && !formaValida(campos.forma, modalidade)) campos.forma = ''
      if (modalidade === 'PARCELADO_AUTOMATICO' && campos.parcelas.trim() === '') campos.parcelas = PARCELAS_PADRAO
    },
  )

  // Forma que não aceita acréscimo (segundo a API) zera o campo e o desabilita.
  watch(acrescimoHabilitado, (habilitado) => {
    if (!habilitado) campos.acrescimo = ''
  })

  const parcelasNumero = computed(() => {
    if (!/^\d+$/.test(campos.parcelas.trim())) return null
    return Number(campos.parcelas)
  })
  const descontoNumero = computed(() => percentualDeTexto(campos.desconto))
  const acrescimoNumero = computed(() => percentualDeTexto(campos.acrescimo))
  const vencimentoIso = computed(() =>
    campos.primeiroVencimento && dataBrValida(campos.primeiroVencimento, ANO_MINIMO_DATA_PROJETO) ? dataBrParaIso(campos.primeiroVencimento) : '',
  )

  /** Resumo calculado; campos ainda inválidos entram como zero para o resumo acompanhar a digitação. */
  const resultadoLocal = computed(() =>
    calcularCobranca({
      baseCentavos: baseCentavos.value,
      descontoPercentual: descontoNumero.value ?? 0,
      acrescimoPercentual: acrescimoHabilitado.value ? (acrescimoNumero.value ?? 0) : 0,
      modalidade: campos.modalidade,
      parcelas: parcelasNumero.value !== null && parcelasNumero.value >= 1 ? Math.min(parcelasNumero.value, MAXIMO_PARCELAS) : 1,
      primeiroVencimento: vencimentoIso.value,
    }),
  )

  /* ------------------------------ prévia do servidor ------------------------------ */

  const previaServidor = shallowRef<CobrancaCalculada | null>(null)

  /** Condição completa e válida o bastante para o servidor simular; null enquanto faltar algo. */
  const payloadSimulacao = computed<SimularCobrancaPayload | null>(() => {
    if (!servidor || baseCentavos.value <= 0 || campos.forma === '' || !formaValida(campos.forma, campos.modalidade)) return null
    if (vencimentoIso.value === '' || descontoNumero.value === null || acrescimoNumero.value === null) return null
    if (parcelado.value && (parcelasNumero.value === null || parcelasNumero.value < MINIMO_PARCELAS || parcelasNumero.value > MAXIMO_PARCELAS)) {
      return null
    }
    if (acrescimoNumero.value > 0 && !acrescimoHabilitado.value) return null
    return {
      modalidadeCobranca: campos.modalidade,
      formaPagamento: campos.forma as FormaPagamento,
      descontoPercentual: descontoNumero.value,
      acrescimoPercentual: acrescimoHabilitado.value ? acrescimoNumero.value : 0,
      ...(parcelado.value ? { numeroParcelas: parcelasNumero.value ?? undefined } : {}),
      primeiroVencimento: vencimentoIso.value,
      ...(servidor.valorCobradoCentavos ? { valorCobrado: servidor.valorCobradoCentavos.value / 100 } : {}),
    }
  })

  let temporizadorSimulacao: number | undefined
  let ultimaSimulacao = 0

  watch(
    () => JSON.stringify(payloadSimulacao.value),
    (chave) => {
      window.clearTimeout(temporizadorSimulacao)
      const requisicao = ++ultimaSimulacao
      previaServidor.value = null
      if (!servidor || chave === 'null') return
      temporizadorSimulacao = window.setTimeout(async () => {
        try {
          const r = await simularCobrancaDoProjeto(servidor.projetoId, JSON.parse(chave) as SimularCobrancaPayload)
          // Só a última simulação vale: respostas antigas (digitação rápida) são descartadas.
          if (requisicao !== ultimaSimulacao) return
          const subtotal = decimalApiParaCentavos(String(r.subtotal))
          const desconto = decimalApiParaCentavos(String(r.desconto))
          const acrescimo = decimalApiParaCentavos(String(r.acrescimo))
          if (subtotal === null || desconto === null || acrescimo === null || r.parcelas.length === 0) return
          const parcelas = r.parcelas.map((p) => ({
            numero: p.numero,
            vencimento: p.vencimento.slice(0, 10),
            centavos: Math.round(p.valor * 100),
          }))
          previaServidor.value = {
            subtotal,
            desconto,
            acrescimo,
            final: Math.round(r.valorFinal * 100),
            quantidade: parcelas.length,
            parcelas,
            valorParcela: parcelas[0]!.centavos,
            valorUltimaParcela: parcelas[parcelas.length - 1]!.centavos,
          }
        } catch {
          // Recusa ou falha de rede: a conta local segue valendo; o envio de verdade valida tudo.
        }
      }, ATRASO_SIMULACAO_MS)
    },
    { immediate: true },
  )

  onScopeDispose(() => window.clearTimeout(temporizadorSimulacao))

  /** Resumo exibido: o do servidor quando já chegou, senão a conta local. */
  const resultado = computed(() => previaServidor.value ?? resultadoLocal.value)

  /** Quantidade de parcelas usada no resumo ("2x R$ ..."): só mostra enquanto o campo estiver válido. */
  const parcelasValidas = computed(
    () =>
      !parcelado.value ||
      (parcelasNumero.value !== null && parcelasNumero.value >= MINIMO_PARCELAS && parcelasNumero.value <= MAXIMO_PARCELAS),
  )

  /** Mexeu em algo: pede confirmação ao descartar. */
  const alterado = computed(() => {
    const inicial = camposIniciais()
    return CHAVES.some((chave) => campos[chave] !== inicial[chave])
  })

  function validar(): boolean {
    for (const chave of [...CHAVES, 'valor'] as const) erros[chave] = undefined

    if (baseCentavos.value <= 0) erros.valor = 'O valor da cobrança deve ser maior que zero.'

    if (parcelado.value) {
      if (campos.parcelas.trim() === '') erros.parcelas = 'Informe a quantidade de parcelas.'
      else if (parcelasNumero.value === null || parcelasNumero.value < MINIMO_PARCELAS) {
        erros.parcelas = `Informe ao menos ${MINIMO_PARCELAS} parcelas.`
      } else if (parcelasNumero.value > MAXIMO_PARCELAS) erros.parcelas = `Use no máximo ${MAXIMO_PARCELAS} parcelas.`
    }

    if (campos.primeiroVencimento === '') {
      erros.primeiroVencimento = parcelado.value ? 'Informe o vencimento da 1ª parcela.' : 'Informe a data de vencimento.'
    } else if (!dataBrValida(campos.primeiroVencimento, ANO_MINIMO_DATA_PROJETO)) {
      erros.primeiroVencimento = `Data inválida. Use DD/MM/AAAA (ano a partir de ${ANO_MINIMO_DATA_PROJETO}).`
    }

    if (descontoNumero.value === null) erros.desconto = 'Use um percentual entre 0 e 99,99.'
    if (acrescimoNumero.value === null) erros.acrescimo = 'Use um percentual entre 0 e 99,99.'
    else if (acrescimoNumero.value > 0 && !acrescimoHabilitado.value) {
      erros.acrescimo = 'Esta forma de pagamento não aceita acréscimo.'
    }

    if (formasApi.erro.value) erros.forma = 'Não foi possível carregar as formas de pagamento. Tente novamente.'
    else if (campos.forma === '') erros.forma = 'Selecione a forma de pagamento.'
    else if (!formaValida(campos.forma, campos.modalidade)) {
      erros.forma = 'Esta forma de pagamento não está disponível para a modalidade escolhida.'
    }

    if (!erros.desconto && !erros.acrescimo && !erros.valor && resultadoLocal.value.final <= 0) {
      erros.desconto = 'O desconto não pode zerar o valor da cobrança.'
    }

    // Valor final dividido pelas parcelas não pode dar parcela de R$ 0,00 (o backend rejeitaria ou geraria lixo).
    if (
      parcelado.value &&
      !erros.parcelas &&
      !erros.desconto &&
      !erros.acrescimo &&
      !erros.valor &&
      parcelasNumero.value !== null &&
      Math.floor(resultadoLocal.value.final / parcelasNumero.value) < 1
    ) {
      erros.parcelas = 'O valor final não comporta essa quantidade de parcelas (cada parcela precisa de pelo menos R$ 0,01).'
    }

    return !Object.values(erros).some(Boolean)
  }

  /** Condição de cobrança do corpo da requisição (assume campos válidos). */
  function paraPayload(): CondicaoCobrancaPayload {
    return {
      modalidadeCobranca: campos.modalidade,
      formaPagamento: campos.forma as FormaPagamento,
      descontoPercentual: descontoNumero.value ?? 0,
      acrescimoPercentual: acrescimoHabilitado.value ? (acrescimoNumero.value ?? 0) : 0,
      // Em cobrança à vista o backend não deve receber o número de parcelas.
      ...(parcelado.value ? { numeroParcelas: parcelasNumero.value ?? undefined } : {}),
      primeiroVencimento: dataBrParaIso(campos.primeiroVencimento),
    }
  }

  const formas = { opcoes: opcoesForma, carregando: formasApi.carregando, erro: formasApi.erro, recarregar: formasApi.carregar }

  return { campos, erros, parcelado, acrescimoHabilitado, formas, resultado, parcelasValidas, alterado, validar, paraPayload }
}
