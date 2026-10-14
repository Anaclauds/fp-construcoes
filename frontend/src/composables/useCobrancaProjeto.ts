import { computed, reactive, watch, type Ref } from 'vue'
import type { FormaPagamento } from '../types/cobranca'
import type { CondicaoCobrancaPayload, ModalidadeCobrancaProjeto } from '../types/projeto'
import { dataBrParaIso } from '../utils/formatadores'
import {
  calcularCobranca,
  formaAceitaAcrescimo,
  formaValidaNaModalidade,
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

function camposIniciais(): CamposCobrancaProjeto {
  return { modalidade: 'A_VISTA', parcelas: PARCELAS_PADRAO, primeiroVencimento: '', acrescimo: '', desconto: '', forma: '' }
}

/**
 * Condição de cobrança de um projeto (iniciar Serralheria/Calhas e registrar etapa de Construção Civil):
 * À Vista ou Parcelado, parcelas, 1º vencimento, acréscimo, desconto e forma de pagamento, com o resumo
 * calculado igual ao backend (ver `calcularCobranca`). `baseCentavos` é o valor sobre o qual a cobrança incide.
 */
export function useCobrancaProjeto(baseCentavos: Ref<number>) {
  const campos = reactive<CamposCobrancaProjeto>(camposIniciais())
  const erros = reactive<ErrosCobrancaProjeto>({})

  const parcelado = computed(() => campos.modalidade === 'PARCELADO_AUTOMATICO')
  const acrescimoHabilitado = computed(() => formaAceitaAcrescimo(campos.forma))

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
        if (erros.valor) erros.valor = undefined
      },
    )
  }

  // Trocar a modalidade limpa a forma que ela não aceita (débito só à vista; no parcelado só 3 formas).
  watch(
    () => campos.modalidade,
    (modalidade) => {
      if (campos.forma && !formaValidaNaModalidade(campos.forma, modalidade)) campos.forma = ''
      if (modalidade === 'PARCELADO_AUTOMATICO' && campos.parcelas.trim() === '') campos.parcelas = PARCELAS_PADRAO
    },
  )

  // Acréscimo só existe para crédito, débito e boleto: outra forma zera o campo (e o desabilita).
  watch(
    () => campos.forma,
    () => {
      if (!acrescimoHabilitado.value) campos.acrescimo = ''
    },
  )

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
  const resultado = computed(() =>
    calcularCobranca({
      baseCentavos: baseCentavos.value,
      descontoPercentual: descontoNumero.value ?? 0,
      acrescimoPercentual: acrescimoHabilitado.value ? (acrescimoNumero.value ?? 0) : 0,
      modalidade: campos.modalidade,
      parcelas: parcelasNumero.value !== null && parcelasNumero.value >= 1 ? Math.min(parcelasNumero.value, MAXIMO_PARCELAS) : 1,
      primeiroVencimento: vencimentoIso.value,
    }),
  )

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
      erros.acrescimo = 'Acréscimo só vale para cartão de crédito, cartão de débito ou boleto.'
    }

    if (campos.forma === '') erros.forma = 'Selecione a forma de pagamento.'
    else if (!formaValidaNaModalidade(campos.forma, campos.modalidade)) {
      erros.forma = 'Esta forma de pagamento não está disponível para a modalidade escolhida.'
    }

    if (!erros.desconto && !erros.acrescimo && !erros.valor && resultado.value.final <= 0) {
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
      Math.floor(resultado.value.final / parcelasNumero.value) < 1
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

  return { campos, erros, parcelado, acrescimoHabilitado, resultado, parcelasValidas, alterado, validar, paraPayload }
}
