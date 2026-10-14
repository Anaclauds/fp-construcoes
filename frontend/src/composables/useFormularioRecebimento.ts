import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import type { Cobranca, FormaPagamento, Parcela, RecebimentoPayload } from '../types'
import { mensagemCobranca, parcelaAbertaParaReceber, restanteDaParcela } from '../utils/cobrancas'
import { hojeIso } from '../utils/datas'
import { dataBrParaIso, formatarMoeda, isoParaDataBr, moedaParaNumero, semAcento } from '../utils/formatadores'
import { dataBrValida } from '../utils/validacao'

export interface CamposRecebimento {
  parcelaId: string
  valor: string
  data: string
  formaPagamento: string
  observacoes: string
}

export type ErrosRecebimento = Partial<Record<keyof CamposRecebimento, string>>

const CHAVES: (keyof CamposRecebimento)[] = ['parcelaId', 'valor', 'data', 'formaPagamento', 'observacoes']
const LIMITE_OBSERVACOES = 1000

/**
 * Formulário "Registrar Recebimento": nasce com a primeira parcela em aberto escolhida, o valor igual ao restante
 * dela e a data de hoje. Trocar de parcela recoloca o valor do restante da nova parcela.
 */
export function useFormularioRecebimento(cobranca: Cobranca) {
  const parcelasAbertas: Parcela[] = cobranca.parcelas
    .filter(parcelaAbertaParaReceber)
    .sort((a, b) => a.numero - b.numero)

  const parcelaInicial = parcelasAbertas[0]
  const idInicial = parcelaInicial ? String(parcelaInicial.id) : ''
  const hoje = isoParaDataBr(hojeIso())
  const valorInicial = parcelaInicial ? formatarMoeda(restanteDaParcela(parcelaInicial)) : ''

  const campos = reactive<CamposRecebimento>({
    parcelaId: idInicial,
    valor: valorInicial,
    data: hoje,
    formaPagamento: '',
    observacoes: '',
  })
  const erros = reactive<ErrosRecebimento>({})
  const erroGeral = shallowRef<string | null>(null)
  /** O backend disse que a cobrança mudou (já paga, cancelada...): a tela precisa recarregar. */
  const desatualizado = shallowRef(false)

  const parcelaEscolhida = computed(() => parcelasAbertas.find((p) => String(p.id) === campos.parcelaId) ?? null)
  const restanteEscolhido = computed(() => (parcelaEscolhida.value ? restanteDaParcela(parcelaEscolhida.value) : 0))

  /** Mexeu em algo além do que o formulário já trazia: pede confirmação ao descartar. */
  const alterado = computed(
    () =>
      campos.parcelaId !== idInicial ||
      campos.valor !== valorInicial ||
      campos.data !== hoje ||
      campos.formaPagamento !== '' ||
      campos.observacoes.trim() !== '',
  )

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
      },
    )
  }

  watch(
    () => campos.parcelaId,
    () => {
      campos.valor = parcelaEscolhida.value ? formatarMoeda(restanteDaParcela(parcelaEscolhida.value)) : ''
    },
  )

  function validar(): boolean {
    erroGeral.value = null

    erros.parcelaId = parcelaEscolhida.value ? undefined : 'Selecione a parcela.'

    const valor = moedaParaNumero(campos.valor)
    if (valor === null) erros.valor = 'Informe o valor recebido.'
    else if (valor <= 0) erros.valor = 'O valor deve ser maior que zero.'
    else if (parcelaEscolhida.value && Math.round(valor * 100) > Math.round(restanteEscolhido.value * 100)) {
      erros.valor = `O valor não pode passar do restante da parcela (${formatarMoeda(restanteEscolhido.value)}).`
    } else erros.valor = undefined

    if (campos.data === '') erros.data = 'Informe a data.'
    else if (!dataBrValida(campos.data)) erros.data = 'Data inválida. Use DD/MM/AAAA.'
    else if (dataBrParaIso(campos.data) > hojeIso()) erros.data = 'A data do recebimento não pode ser futura.'
    else erros.data = undefined

    erros.formaPagamento = campos.formaPagamento === '' ? 'Selecione a forma de pagamento.' : undefined

    erros.observacoes =
      campos.observacoes.length > LIMITE_OBSERVACOES ? `Use no máximo ${LIMITE_OBSERVACOES} caracteres.` : undefined

    return !Object.values(erros).some(Boolean)
  }

  /** Corpo do POST (assume campos válidos). */
  function paraPayload(): RecebimentoPayload {
    const observacoes = campos.observacoes.trim()
    return {
      parcelaId: Number(campos.parcelaId),
      valor: moedaParaNumero(campos.valor) ?? 0,
      dataRecebimento: dataBrParaIso(campos.data),
      formaPagamento: campos.formaPagamento as FormaPagamento,
      ...(observacoes ? { observacoes } : {}),
    }
  }

  /** Caixa fechado, valor acima do restante, cobrança já paga... viram mensagem no próprio modal. */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    const texto = mensagemCobranca(mensagem)
    if (/superior ao restante/i.test(semAcento(mensagem))) {
      erros.valor = texto
      return
    }
    // Caixa do mês fechado: o problema é a data escolhida, então o erro aparece (e recebe o foco) no campo Data.
    if (/caixa da competencia .* fechado/i.test(semAcento(mensagem))) {
      erros.data = texto
      return
    }
    if (/paga ou cancelada|nao pertence|nao encontrada/i.test(semAcento(mensagem)) || status === 404) desatualizado.value = true
    erroGeral.value = texto
  }

  return { campos, erros, erroGeral, desatualizado, parcelasAbertas, parcelaEscolhida, restanteEscolhido, alterado, validar, paraPayload, tratarErroApi }
}
