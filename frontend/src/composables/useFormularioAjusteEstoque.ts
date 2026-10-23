import { computed, reactive, shallowRef, watch, type Ref } from 'vue'
import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { extrairErro } from '../services/api'
import type { AjusteEstoquePayload, TipoAjusteEstoque } from '../types/estoque'
import {
  LIMITE_JUSTIFICATIVA,
  QUANTIDADE_MAXIMA,
  mensagemErroEstoque,
  quantidadeComUnidade,
  quantidadeParaNumero,
  unidadeExigeInteiro,
} from '../utils/estoque'
import { simboloUnidade } from '../utils/materiais'

export interface CamposAjusteEstoque {
  tipo: '' | TipoAjusteEstoque
  quantidade: string
  justificativa: string
}

export type ErrosAjusteEstoque = Partial<Record<keyof CamposAjusteEstoque, string>>

const CHAVES: (keyof CamposAjusteEstoque)[] = ['tipo', 'quantidade', 'justificativa']

const CODIGOS_DE_QUANTIDADE = [
  'ESTOQUE_SAIDA_ACIMA_DO_DISPONIVEL',
  'ESTOQUE_LIMITE_EXCEDIDO',
  'ESTOQUE_SALDO_ALTERADO',
  'QUANTIDADE_INTEIRA_OBRIGATORIA',
]

export const OPCOES_TIPO_AJUSTE: OpcaoCampo[] = [
  { valor: 'AJUSTE_ENTRADA', rotulo: 'Entrada (adicionar ao estoque)' },
  { valor: 'AJUSTE_SAIDA', rotulo: 'Saída (reduzir do estoque)' },
]

/**
 * Formulário do modal "Ajustar Estoque". `disponivel` e `unidade` vêm do detalhe carregado: a saída não pode passar
 * do saldo disponível (atual - reservado), a entrada não pode levar o saldo atual além do limite da coluna e o rótulo da quantidade usa a unidade do material.
 */
export function useFormularioAjusteEstoque(disponivel: Ref<number | null>, unidade: Ref<string>, atual: Ref<number | null>) {
  const campos = reactive<CamposAjusteEstoque>({ tipo: '', quantidade: '', justificativa: '' })
  const erros = reactive<ErrosAjusteEstoque>({})
  const erroGeral = shallowRef<string | null>(null)

  const simbolo = computed(() => (unidade.value ? simboloUnidade(unidade.value) : ''))
  const sufixo = computed(() => (simbolo.value ? ` (${simbolo.value})` : ''))

  /** Figma: "Quantidade a Reduzir (m)". Troca para "a Adicionar" na entrada. */
  const rotuloQuantidade = computed(() => {
    if (campos.tipo === 'AJUSTE_ENTRADA') return `Quantidade a Adicionar${sufixo.value}:`
    if (campos.tipo === 'AJUSTE_SAIDA') return `Quantidade a Reduzir${sufixo.value}:`
    return `Quantidade${sufixo.value}:`
  })

  /** Quanto cabe numa entrada, em milésimos (a coluna é DECIMAL(12,3)); null enquanto o saldo não carregou. */
  const maximoEntrada = computed(() =>
    atual.value === null ? null : Math.max(0, Math.round(QUANTIDADE_MAXIMA * 1000) - Math.round(atual.value * 1000)) / 1000,
  )

  /** "Máximo ajustável: 65 m (saldo disponível)" na saída; "Máximo para entrada: ..." na entrada. */
  const dicaMaximo = computed(() => {
    if (campos.tipo === 'AJUSTE_SAIDA' && disponivel.value !== null) {
      return `Máximo ajustável: ${quantidadeComUnidade(disponivel.value, unidade.value)} (saldo disponível)`
    }
    if (campos.tipo === 'AJUSTE_ENTRADA' && maximoEntrada.value !== null) {
      return `Máximo para entrada: ${quantidadeComUnidade(maximoEntrada.value, unidade.value)}`
    }
    return undefined
  })

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
      },
    )
  }
  // Trocar entrada/saída muda a regra da quantidade: o erro anterior deixa de valer.
  watch(
    () => campos.tipo,
    () => {
      erros.quantidade = undefined
    },
  )

  function validar(): boolean {
    erroGeral.value = null
    const resultado: ErrosAjusteEstoque = {}

    if (campos.tipo === '') resultado.tipo = 'Selecione o tipo de ajuste.'

    const quantidade = quantidadeParaNumero(campos.quantidade)
    if (campos.quantidade.trim() === '') resultado.quantidade = 'Informe a quantidade.'
    else if (quantidade === null) resultado.quantidade = 'Quantidade inválida. Use até 3 casas decimais.'
    else if (quantidade < 0.001) resultado.quantidade = 'A quantidade deve ser de pelo menos 0,001.'
    else if (quantidade > QUANTIDADE_MAXIMA) resultado.quantidade = 'Quantidade acima do limite permitido.'
    else if (unidade.value && unidadeExigeInteiro(unidade.value) && !Number.isInteger(quantidade)) {
      resultado.quantidade = 'Esta unidade exige quantidade inteira.'
    }
    else if (campos.tipo === 'AJUSTE_ENTRADA' && maximoEntrada.value !== null && quantidade > maximoEntrada.value) {
      resultado.quantidade = `A entrada passaria do limite do estoque. Máximo para entrada: ${quantidadeComUnidade(maximoEntrada.value, unidade.value)}.`
    } else if (campos.tipo === 'AJUSTE_SAIDA' && disponivel.value !== null && quantidade > disponivel.value) {
      resultado.quantidade = `A saída não pode passar do saldo disponível (${quantidadeComUnidade(disponivel.value, unidade.value)}).`
    }

    const justificativa = campos.justificativa.trim()
    if (justificativa === '') resultado.justificativa = 'Informe a justificativa do ajuste.'
    else if (justificativa.length > LIMITE_JUSTIFICATIVA) resultado.justificativa = `Use no máximo ${LIMITE_JUSTIFICATIVA} caracteres.`

    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  function paraPayload(): AjusteEstoquePayload {
    return {
      tipo: campos.tipo as TipoAjusteEstoque,
      quantidade: quantidadeParaNumero(campos.quantidade) ?? 0,
      justificativa: campos.justificativa.trim(),
    }
  }

  const alterado = computed(() => CHAVES.some((chave) => campos[chave].trim() !== ''))

  /** Mostra o erro no campo certo; devolve true quando o saldo mudou no servidor (tela precisa atualizar o saldo). */
  function tratarErroApi(erro: unknown): boolean {
    const detalhado = extrairErro(erro)
    const mensagem = mensagemErroEstoque(detalhado, unidade.value)
    // Erros de quantidade e de saldo ficam no campo; só o saldo alterado pede para recarregar o resumo.
    if (CODIGOS_DE_QUANTIDADE.includes(detalhado.codigo) || detalhado.campo === 'quantidade') {
      erros.quantidade = mensagem
      return detalhado.codigo !== 'QUANTIDADE_INTEIRA_OBRIGATORIA'
    }
    erroGeral.value = mensagem
    return false
  }

  return { campos, erros, erroGeral, rotuloQuantidade, dicaMaximo, validar, paraPayload, alterado, tratarErroApi }
}

export type FormularioAjusteEstoque = ReturnType<typeof useFormularioAjusteEstoque>
