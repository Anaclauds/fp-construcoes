import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import type {
  CategoriaDespesa,
  Despesa,
  DespesaAtualizacao,
  DespesaPayload,
  ItemCompraPayload,
  TipoDespesa,
} from '../types/despesa'
import { hojeIso } from '../utils/datas'
import {
  ANO_MINIMO_DESPESA,
  CATEGORIAS_DIVERSA,
  LIMITE_DESCRICAO_DESPESA,
  LIMITE_UNIDADE_COMPRA,
  QUANTIDADE_MAXIMA_COMPRA,
  VALOR_MAXIMO_DESPESA,
  mensagemDeCaixaFechado,
  mensagemDespesa,
  totalItemCompraCentavos,
} from '../utils/despesas'
import { dataBrParaIso, formatarMoeda, isoParaDataBr, moedaParaNumero, limparEspacos } from '../utils/formatadores'
import { decimalApiParaTexto, textoParaEscala } from '../utils/orcamentos'
import { dataBrValida } from '../utils/validacao'

/** Linha de material de uma compra; os textos estão como aparecem nos campos. */
export interface LinhaCompra {
  chave: number
  materialId: string
  quantidade: string
  /** Sempre a unidade do cadastro do material: a API não converte unidades no estoque. */
  unidade: string
  valorUnitario: string
}

export interface CamposDespesa {
  tipo: TipoDespesa
  data: string
  categoria: string
  valor: string
  descricao: string
  fornecedorId: string
}

export type ErrosDespesa = Partial<Record<keyof CamposDespesa | 'itens', string>>
export interface ErrosLinhaCompra {
  item?: string
  quantidade?: string
  valorUnitario?: string
}

const CHAVES: (keyof CamposDespesa)[] = ['tipo', 'data', 'categoria', 'valor', 'descricao', 'fornecedorId']

let proximaChave = 1

function linhaVazia(): LinhaCompra {
  return { chave: proximaChave++, materialId: '', quantidade: '', unidade: '', valorUnitario: '' }
}

function linhasDaDespesa(d: Despesa): LinhaCompra[] {
  return d.materiais.map((item) => ({
    chave: proximaChave++,
    materialId: String(item.materialId),
    quantidade: decimalApiParaTexto(item.quantidade),
    unidade: item.unidadeMedida,
    valorUnitario: decimalApiParaTexto(item.valorUnitario, 2),
  }))
}

function camposDaDespesa(d: Despesa): CamposDespesa {
  return {
    tipo: d.tipo,
    data: isoParaDataBr(d.data),
    categoria: d.categoria ?? '',
    valor: formatarMoeda(d.valorTotal),
    descricao: d.descricao,
    fornecedorId: d.fornecedorId === null ? '' : String(d.fornecedorId),
  }
}

interface ItemNormalizado {
  materialId: number
  quantidade: number
  unidadeMedida: string
  valorUnitario: number
}

interface Normalizado {
  data: string
  descricao: string
  categoria: string
  valorTotal: number | null
  fornecedorId: number | null
  materiais: ItemNormalizado[]
}

function normalizar(c: CamposDespesa, linhas: LinhaCompra[]): Normalizado {
  const ehCompra = c.tipo === 'COMPRA_MATERIAL'
  return {
    data: dataBrValida(c.data, ANO_MINIMO_DESPESA) ? dataBrParaIso(c.data) : '',
    descricao: limparEspacos(c.descricao),
    categoria: ehCompra ? 'COMPRA_MATERIAL' : c.categoria,
    valorTotal: ehCompra ? null : moedaParaNumero(c.valor),
    fornecedorId: ehCompra && c.fornecedorId !== '' ? Number(c.fornecedorId) : null,
    materiais: ehCompra
      ? linhas
          .map((l) => ({
            materialId: Number(l.materialId),
            quantidade: (textoParaEscala(l.quantidade, 3) ?? 0) / 1000,
            unidadeMedida: l.unidade,
            valorUnitario: (textoParaEscala(l.valorUnitario, 2) ?? 0) / 100,
          }))
          .sort((a, b) => a.materialId - b.materialId)
      : [],
  }
}

function mesmosItens(a: ItemNormalizado[], b: ItemNormalizado[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, i) =>
        item.materialId === b[i]!.materialId &&
        item.quantidade === b[i]!.quantidade &&
        item.unidadeMedida === b[i]!.unidadeMedida &&
        item.valorUnitario === b[i]!.valorUnitario,
    )
  )
}

/**
 * Estado, validação e conversão do formulário de despesa (cadastro e edição, tipo Diversa e Compra de Material).
 * Com `inicial`, preenche os campos e serve de base para enviar só o que mudou no PATCH.
 */
export function useFormularioDespesa(inicial?: Despesa) {
  const camposIniciais = inicial ? camposDaDespesa(inicial) : null
  const campos = reactive<CamposDespesa>(
    camposIniciais
      ? { ...camposIniciais }
      : { tipo: 'DIVERSA', data: isoParaDataBr(hojeIso()), categoria: '', valor: '', descricao: '', fornecedorId: '' },
  )
  // Lista profunda: os campos de cada linha são editados direto pelos v-model.
  const itens = ref<LinhaCompra[]>(inicial ? linhasDaDespesa(inicial) : [linhaVazia()])
  const erros = reactive<ErrosDespesa>({})
  const errosItens = reactive<Record<number, ErrosLinhaCompra>>({})
  const erroGeral = shallowRef<string | null>(null)
  /** O caixa do mês da despesa (ou da nova data) está fechado. */
  const caixaFechado = shallowRef(false)

  const compra = computed(() => campos.tipo === 'COMPRA_MATERIAL')
  const base: Normalizado | null =
    camposIniciais && inicial ? normalizar(camposIniciais, linhasDaDespesa(inicial)) : null

  // Mexeu no campo: o erro daquele campo some até a próxima validação.
  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
        erroGeral.value = null
      },
    )
  }

  function totalDaLinha(linha: LinhaCompra): number {
    const quantidade = textoParaEscala(linha.quantidade, 3)
    const valor = textoParaEscala(linha.valorUnitario, 2)
    return quantidade === null || valor === null ? 0 : totalItemCompraCentavos(quantidade, valor)
  }

  /** Total da compra em centavos (itens incompletos contam zero, o total acompanha a digitação). */
  const totalCompraCentavos = computed(() => itens.value.reduce((soma, l) => soma + totalDaLinha(l), 0))
  const totalCompraTexto = computed(() => formatarMoeda(totalCompraCentavos.value / 100))

  function adicionarItem() {
    itens.value = [...itens.value, linhaVazia()]
    erros.itens = undefined
  }

  function removerItem(chave: number) {
    const restantes = itens.value.filter((l) => l.chave !== chave)
    itens.value = restantes.length > 0 ? restantes : [linhaVazia()]
    delete errosItens[chave]
  }

  function escolherMaterial(linha: LinhaCompra, materialId: string, unidade: string) {
    linha.materialId = materialId
    linha.unidade = unidade
    if (errosItens[linha.chave]) errosItens[linha.chave]!.item = undefined
    erros.itens = undefined
    erroGeral.value = null
  }

  function aoDigitarItem(linha: LinhaCompra, campo: 'quantidade' | 'valorUnitario') {
    const erro = errosItens[linha.chave]
    if (erro) erro[campo] = undefined
    erroGeral.value = null
  }

  function validarCompra(resultado: ErrosDespesa): Record<number, ErrosLinhaCompra> {
    const errosDasLinhas: Record<number, ErrosLinhaCompra> = {}
    if (campos.fornecedorId === '') resultado.fornecedorId = 'Selecione o fornecedor.'

    const vistos = new Set<string>()
    for (const linha of itens.value) {
      const e: ErrosLinhaCompra = {}
      if (linha.materialId === '') e.item = 'Selecione o material.'
      else if (vistos.has(linha.materialId)) e.item = 'Material repetido.'
      else vistos.add(linha.materialId)

      const quantidade = textoParaEscala(linha.quantidade, 3)
      if (linha.quantidade.trim() === '' || quantidade === null) e.quantidade = 'Informe a quantidade.'
      else if (quantidade < 1) e.quantidade = 'Mínimo 0,001.'
      else if (quantidade / 1000 > QUANTIDADE_MAXIMA_COMPRA) e.quantidade = 'Quantidade acima do limite.'

      const valor = textoParaEscala(linha.valorUnitario, 2)
      if (linha.valorUnitario.trim() === '' || valor === null) e.valorUnitario = 'Informe o valor.'
      else if (valor < 1) e.valorUnitario = 'Mínimo R$ 0,01.'
      else if (valor / 100 > VALOR_MAXIMO_DESPESA) e.valorUnitario = 'Valor acima do limite.'

      // Quantidade e valor mínimos juntos podem render menos de 1 centavo (0,001 x R$ 0,01): a API recusaria o total zero.
      if (quantidade !== null && valor !== null && !e.quantidade && !e.valorUnitario && totalItemCompraCentavos(quantidade, valor) < 1) {
        e.valorUnitario = 'Total do item menor que R$ 0,01.'
      }

      if (linha.unidade.length > LIMITE_UNIDADE_COMPRA) e.item = 'Unidade do material longa demais.'
      if (Object.keys(e).length > 0) errosDasLinhas[linha.chave] = e
    }
    if (totalCompraCentavos.value / 100 > VALOR_MAXIMO_DESPESA) {
      resultado.itens = 'O total da compra passa do limite permitido.'
    } else if (Object.keys(errosDasLinhas).length === 0 && totalCompraCentavos.value < 1) {
      resultado.itens = 'O total da compra deve ser de pelo menos R$ 0,01.'
    }
    return errosDasLinhas
  }

  function validar(): boolean {
    erroGeral.value = null
    const resultado: ErrosDespesa = {}
    let errosDasLinhas: Record<number, ErrosLinhaCompra> = {}

    // Data real, a partir do ano mínimo e nunca futura (data futura criaria o caixa de um mês que ainda não existe).
    if (campos.data.trim() === '') resultado.data = 'Informe a data.'
    else if (!dataBrValida(campos.data, ANO_MINIMO_DESPESA)) resultado.data = 'Data inválida.'
    else if (dataBrParaIso(campos.data) > hojeIso() && dataBrParaIso(campos.data) !== base?.data) {
      resultado.data = 'A data não pode ser futura.'
    }

    const descricao = campos.descricao.trim()
    if (descricao === '') resultado.descricao = 'Descreva a despesa.'
    else if (descricao.length > LIMITE_DESCRICAO_DESPESA) {
      resultado.descricao = `Use no máximo ${LIMITE_DESCRICAO_DESPESA} caracteres.`
    }

    if (compra.value) {
      errosDasLinhas = validarCompra(resultado)
    } else {
      // Despesa antiga sem categoria não trava a edição de outros campos enquanto a categoria não for mexida.
      if (campos.categoria === '' && !(base && base.categoria === '')) resultado.categoria = 'Selecione a categoria.'
      else if (campos.categoria !== '' && !CATEGORIAS_DIVERSA.includes(campos.categoria as CategoriaDespesa)) {
        resultado.categoria = 'Categoria inválida.'
      }

      const valor = moedaParaNumero(campos.valor)
      if (valor === null) resultado.valor = 'Informe o valor.'
      else if (valor < 0.01) resultado.valor = 'O valor deve ser de pelo menos R$ 0,01.'
      else if (valor > VALOR_MAXIMO_DESPESA) resultado.valor = 'Valor acima do limite permitido.'
    }

    for (const chave of CHAVES) erros[chave] = resultado[chave]
    erros.itens = resultado.itens
    for (const chave of Object.keys(errosItens)) delete errosItens[Number(chave)]
    Object.assign(errosItens, errosDasLinhas)
    return Object.keys(resultado).length === 0 && Object.keys(errosDasLinhas).length === 0
  }

  /** Corpo do POST: diversa leva categoria e valor; compra leva fornecedor e itens (o total a API calcula). */
  function paraPayload(): DespesaPayload {
    const n = normalizar(campos, itens.value)
    if (campos.tipo === 'DIVERSA') {
      return {
        tipo: 'DIVERSA',
        categoria: n.categoria as CategoriaDespesa,
        data: n.data,
        descricao: n.descricao,
        valorTotal: n.valorTotal ?? 0,
      }
    }
    return {
      tipo: 'COMPRA_MATERIAL',
      data: n.data,
      descricao: n.descricao,
      fornecedorId: n.fornecedorId ?? 0,
      materiais: n.materiais.map<ItemCompraPayload>((m) => ({ ...m })),
    }
  }

  /** Corpo do PATCH: só o que mudou. Se algum item da compra mudou, a lista inteira vai (a API a substitui). */
  function paraAtualizacao(): DespesaAtualizacao {
    const atual = normalizar(campos, itens.value)
    const mudou: DespesaAtualizacao = {}
    if (!base) return mudou
    if (atual.data !== base.data) mudou.data = atual.data
    if (atual.descricao !== base.descricao) mudou.descricao = atual.descricao
    if (campos.tipo === 'DIVERSA') {
      if (atual.categoria !== base.categoria && atual.categoria !== '') {
        mudou.categoria = atual.categoria as CategoriaDespesa
      }
      if (atual.valorTotal !== base.valorTotal && atual.valorTotal !== null) mudou.valorTotal = atual.valorTotal
    } else {
      if (atual.fornecedorId !== base.fornecedorId && atual.fornecedorId !== null) {
        mudou.fornecedorId = atual.fornecedorId
      }
      if (!mesmosItens(atual.materiais, base.materiais)) {
        mudou.materiais = atual.materiais.map<ItemCompraPayload>((m) => ({ ...m }))
      }
    }
    return mudou
  }

  const alterado = computed(() => {
    if (base) return Object.keys(paraAtualizacao()).length > 0
    return (
      campos.descricao.trim() !== '' ||
      campos.valor !== '' ||
      campos.categoria !== '' ||
      campos.fornecedorId !== '' ||
      itens.value.some((l) => l.materialId !== '' || l.quantidade !== '' || l.valorUnitario !== '')
    )
  })

  /** Erros da API: sem campo único, tudo vira mensagem geral (com travas para o que não se resolve no formulário). */
  function tratarErroApi(erro: unknown) {
    const { mensagem } = extrairErro(erro)
    caixaFechado.value = mensagemDeCaixaFechado(mensagem)
    erroGeral.value = mensagemDespesa(mensagem)
  }

  return {
    campos,
    itens,
    erros,
    errosItens,
    erroGeral,
    caixaFechado,
    compra,
    totalCompraCentavos,
    totalCompraTexto,
    totalDaLinha,
    adicionarItem,
    removerItem,
    escolherMaterial,
    aoDigitarItem,
    validar,
    paraPayload,
    paraAtualizacao,
    alterado,
    tratarErroApi,
  }
}

export type FormularioDespesa = ReturnType<typeof useFormularioDespesa>
