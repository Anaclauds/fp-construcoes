import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import type {
  Despesa,
  DespesaAtualizacao,
  DespesaPayload,
  ItemCompraPayload,
  TipoDespesa,
} from '../types/despesa'
import { hojeIso } from '../utils/datas'
import { CATEGORIA_COMPRA_MATERIAL } from '../types/despesa'
import {
  ANO_MINIMO_DESPESA,
  LIMITE_DESCRICAO_DESPESA,
  LIMITE_UNIDADE_COMPRA,
  QUANTIDADE_MAXIMA_COMPRA,
  VALOR_MAXIMO_DESPESA,
  mensagemDeCaixaFechado,
  mensagemDespesa,
  projetoDoExtra,
  totalItemCompraCentavos,
} from '../utils/despesas'
import { QUANTIDADE_MAXIMA, mensagemErroEstoque, quantidadeComUnidade, unidadeExigeInteiro } from '../utils/estoque'
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
  /** Nome da categoria no catálogo (o formulário mostra o rótulo e envia este nome). */
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

/** Códigos do backend cuja mensagem vem de `mensagemErroEstoque` (usa `detalhes`, ex.: o máximo de entrada). */
// ESTOQUE_SALDO_ALTERADO fica fora: em despesas significa "o estoque não comporta reduzir esta compra" (mensagemDespesa).
const CODIGOS_ESTOQUE = ['ESTOQUE_LIMITE_EXCEDIDO', 'QUANTIDADE_INTEIRA_OBRIGATORIA']

/** Texto curto do campo; o detalhe ("Máximo para esta compra: ...") aparece na linha abaixo, que cabe a frase inteira. */
export const ERRO_LIMITE_ESTOQUE = 'Acima do máximo da compra.'

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
    categoria: ehCompra ? CATEGORIA_COMPRA_MATERIAL : c.categoria,
    valorTotal: ehCompra ? null : moedaParaNumero(c.valor),
    fornecedorId: c.fornecedorId !== '' ? Number(c.fornecedorId) : null,
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
 * `saldoAtual` (opcional) informa o saldo do estoque do material; com ele a quantidade é barrada antes de o estoque passar do limite.
 * Despesa gerada por extra de projeto só tem a descrição editável: valor, data, categoria e fornecedor vêm do extra.
 */
export function useFormularioDespesa(inicial?: Despesa, saldoAtual?: (materialId: number) => number | null) {
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
  /** Despesa de extra de projeto: só a descrição pode mudar. */
  const somenteDescricao = inicial !== undefined && projetoDoExtra(inicial) !== null
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

  /**
   * Quanto ainda cabe na compra deste material, em milésimos: limite da coluna (DECIMAL(12,3)) menos o saldo atual.
   * Na edição a quantidade já gravada nesta despesa volta ao cálculo (a API a desfaz antes de aplicar a nova).
   * `null` enquanto o saldo é desconhecido (sem permissão de Estoque ou ainda carregando).
   */
  function maximoCompra(linha: LinhaCompra): number | null {
    if (!saldoAtual || linha.materialId === '') return null
    const materialId = Number(linha.materialId)
    const atual = saldoAtual(materialId)
    if (atual === null) return null
    const gravada = base?.materiais.find((m) => m.materialId === materialId)?.quantidade ?? 0
    const limite = Math.round(QUANTIDADE_MAXIMA * 1000)
    return Math.max(0, limite - Math.round(atual * 1000) + Math.round(gravada * 1000))
  }

  /** "Máximo para esta compra: 999.999.000 m", ou `undefined` com o saldo desconhecido. */
  function dicaMaximoCompra(linha: LinhaCompra): string | undefined {
    const maximo = maximoCompra(linha)
    return maximo === null ? undefined : `Máximo para esta compra: ${quantidadeComUnidade(maximo / 1000, linha.unidade)}`
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
      else if (unidadeExigeInteiro(linha.unidade) && quantidade % 1000 !== 0) e.quantidade = 'Esta unidade exige quantidade inteira.'
      else if (quantidade / 1000 > QUANTIDADE_MAXIMA_COMPRA) e.quantidade = 'Quantidade acima do limite.'
      else if (maximoCompra(linha) !== null && quantidade > maximoCompra(linha)!) {
        e.quantidade = ERRO_LIMITE_ESTOQUE
      }

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

    // Data real, a partir do ano mínimo e nunca futura (a API só aceita de 2000 até hoje). Em despesa de extra a data não muda.
    if (!somenteDescricao) {
      if (campos.data.trim() === '') resultado.data = 'Informe a data.'
      else if (!dataBrValida(campos.data, ANO_MINIMO_DESPESA)) resultado.data = 'Data inválida.'
      else if (dataBrParaIso(campos.data) > hojeIso() && dataBrParaIso(campos.data) !== base?.data) {
        resultado.data = 'A data não pode ser futura.'
      }
    }

    const descricao = campos.descricao.trim()
    if (descricao === '') resultado.descricao = 'Descreva a despesa.'
    else if (descricao.length > LIMITE_DESCRICAO_DESPESA) {
      resultado.descricao = `Use no máximo ${LIMITE_DESCRICAO_DESPESA} caracteres.`
    }

    if (somenteDescricao) {
      // Valor, categoria e fornecedor do extra não são validados nem enviados.
    } else if (compra.value) {
      errosDasLinhas = validarCompra(resultado)
    } else {
      // A categoria da despesa diversa é obrigatória e precisa estar no catálogo (a API confere o catálogo).
      if (campos.categoria === '') resultado.categoria = 'Selecione a categoria.'

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

  /** Corpo do POST: diversa leva categoria, valor e fornecedor opcional; compra leva fornecedor e itens (a categoria e o total a API define). */
  function paraPayload(): DespesaPayload {
    const n = normalizar(campos, itens.value)
    if (campos.tipo === 'DIVERSA') {
      return {
        tipo: 'DIVERSA',
        categoria: n.categoria,
        data: n.data,
        descricao: n.descricao,
        valorTotal: n.valorTotal ?? 0,
        ...(n.fornecedorId !== null ? { fornecedorId: n.fornecedorId } : {}),
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

  /**
   * Corpo do PATCH: só o que mudou. Se algum item da compra mudou, a lista inteira vai (a API a substitui).
   * Na despesa diversa, `fornecedorId: null` remove o fornecedor. Na de extra, só a descrição.
   */
  function paraAtualizacao(): DespesaAtualizacao {
    const atual = normalizar(campos, itens.value)
    const mudou: DespesaAtualizacao = {}
    if (!base) return mudou
    if (atual.descricao !== base.descricao) mudou.descricao = atual.descricao
    if (somenteDescricao) return mudou
    if (atual.data !== base.data) mudou.data = atual.data
    if (campos.tipo === 'DIVERSA') {
      if (atual.categoria !== base.categoria && atual.categoria !== '') mudou.categoria = atual.categoria
      if (atual.valorTotal !== base.valorTotal && atual.valorTotal !== null) mudou.valorTotal = atual.valorTotal
      if (atual.fornecedorId !== base.fornecedorId) mudou.fornecedorId = atual.fornecedorId
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
    const detalhado = extrairErro(erro)
    caixaFechado.value = mensagemDeCaixaFechado(detalhado.mensagem, detalhado.codigo)
    erroGeral.value = CODIGOS_ESTOQUE.includes(detalhado.codigo)
      ? mensagemErroEstoque(detalhado)
      : mensagemDespesa(detalhado.mensagem)
  }

  return {
    campos,
    itens,
    erros,
    errosItens,
    erroGeral,
    caixaFechado,
    compra,
    somenteDescricao,
    totalCompraCentavos,
    totalCompraTexto,
    totalDaLinha,
    adicionarItem,
    removerItem,
    escolherMaterial,
    aoDigitarItem,
    maximoCompra,
    dicaMaximoCompra,
    validar,
    paraPayload,
    paraAtualizacao,
    alterado,
    tratarErroApi,
  }
}

export type FormularioDespesa = ReturnType<typeof useFormularioDespesa>
