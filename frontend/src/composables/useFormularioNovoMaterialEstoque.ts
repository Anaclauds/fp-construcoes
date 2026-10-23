import { computed, reactive, shallowRef, watch } from 'vue'
import { errosPorCampo, extrairErro } from '../services/api'
import type { NovoMaterialEstoquePayload } from '../types/estoque'
import { limparEspacos, moedaParaNumero } from '../utils/formatadores'
import {
  QUANTIDADE_MAXIMA,
  mensagemErroEstoque,
  quantidadeParaNumero,
  unidadeExigeInteiro,
} from '../utils/estoque'
import {
  LIMITE_CATEGORIA_MATERIAL,
  LIMITE_NOME_MATERIAL,
  LIMITE_UNIDADE_MATERIAL,
  VALOR_MAXIMO_MATERIAL,
  opcoesDeCatalogo,
  simboloUnidade,
} from '../utils/materiais'
import { useCatalogoMaterial } from './useCatalogoMaterial'

export interface CamposNovoMaterialEstoque {
  nome: string
  categoria: string
  unidade: string
  quantidade: string
  /** Preço de referência já com máscara de moeda. */
  preco: string
}

export type ErrosNovoMaterialEstoque = Partial<Record<keyof CamposNovoMaterialEstoque, string>>

const CHAVES: (keyof CamposNovoMaterialEstoque)[] = ['nome', 'categoria', 'unidade', 'quantidade', 'preco']

/** Formulário do modal "Adicionar Novo Material no Estoque" (`POST /estoque/materiais`). */
export function useFormularioNovoMaterialEstoque() {
  const campos = reactive<CamposNovoMaterialEstoque>({ nome: '', categoria: '', unidade: '', quantidade: '', preco: '' })
  const erros = reactive<ErrosNovoMaterialEstoque>({})
  const erroGeral = shallowRef<string | null>(null)

  // Categorias e unidades vêm do catálogo da API.
  const catalogo = useCatalogoMaterial()
  const opcoes = computed(() => ({
    categoria: opcoesDeCatalogo(catalogo.categorias.value),
    unidade: opcoesDeCatalogo(catalogo.unidades.value),
  }))

  /** "Quantidade Inicial (m)": a unidade escolhida aparece no rótulo, como no Figma. */
  const rotuloQuantidade = computed(() => {
    const simbolo = campos.unidade ? simboloUnidade(campos.unidade) : ''
    return simbolo ? `Quantidade Inicial (${simbolo}):` : 'Quantidade Inicial:'
  })

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
      },
    )
  }

  function validar(): boolean {
    erroGeral.value = null
    const resultado: ErrosNovoMaterialEstoque = {}

    const nome = campos.nome.trim()
    if (nome === '') resultado.nome = 'Informe o nome do material.'
    else if (nome.length > LIMITE_NOME_MATERIAL) resultado.nome = `Use no máximo ${LIMITE_NOME_MATERIAL} caracteres.`

    if (campos.categoria === '') resultado.categoria = 'Selecione a categoria.'
    else if (campos.categoria.length > LIMITE_CATEGORIA_MATERIAL) resultado.categoria = 'Categoria muito longa.'

    if (campos.unidade === '') resultado.unidade = 'Selecione a unidade de medida.'
    else if (campos.unidade.length > LIMITE_UNIDADE_MATERIAL) resultado.unidade = 'Unidade muito longa.'

    const quantidade = quantidadeParaNumero(campos.quantidade)
    if (campos.quantidade.trim() === '') resultado.quantidade = 'Informe a quantidade inicial.'
    else if (quantidade === null) resultado.quantidade = 'Quantidade inválida. Use até 3 casas decimais.'
    else if (quantidade < 0.001) resultado.quantidade = 'Informe uma quantidade maior que zero (mínimo 0,001).'
    else if (quantidade > QUANTIDADE_MAXIMA) resultado.quantidade = 'Quantidade acima do limite permitido.'
    else if (campos.unidade !== '' && unidadeExigeInteiro(campos.unidade) && !Number.isInteger(quantidade)) {
      resultado.quantidade = 'Esta unidade exige quantidade inteira.'
    }

    const preco = moedaParaNumero(campos.preco)
    if (preco === null) resultado.preco = 'Informe o preço de referência.'
    else if (preco < 0.01) resultado.preco = 'O preço deve ser de pelo menos R$ 0,01.'
    else if (preco > VALOR_MAXIMO_MATERIAL) resultado.preco = 'Valor acima do limite permitido.'

    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  function paraPayload(): NovoMaterialEstoquePayload {
    return {
      nome: limparEspacos(campos.nome),
      categoria: campos.categoria,
      unidadeMedida: campos.unidade,
      quantidadeInicial: quantidadeParaNumero(campos.quantidade) ?? 0,
      precoReferencia: moedaParaNumero(campos.preco) ?? 0,
    }
  }

  const alterado = computed(() => CHAVES.some((chave) => campos[chave].trim() !== ''))

  /** Campo do DTO -> campo do formulário (a quantidade chega como `quantidadeInicial` ou `quantidade`). */
  const CAMPO_DO_SERVIDOR: Record<string, keyof CamposNovoMaterialEstoque> = {
    nome: 'nome',
    categoria: 'categoria',
    unidadeMedida: 'unidade',
    quantidadeInicial: 'quantidade',
    quantidade: 'quantidade',
    precoReferencia: 'preco',
  }

  /** Erros de negócio (por `codigo`) e de validação (por campo) vão para o campo citado; o que não tem campo vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    erroGeral.value = null
    const detalhado = extrairErro(erro)
    const mensagem = mensagemErroEstoque(detalhado)
    if (detalhado.codigo === 'MATERIAIS_VALIDARNOME_CONFLICT_01') {
      erros.nome = mensagem
      return
    }
    let mapeado = false
    for (const [campoServidor, mensagemCampo] of Object.entries(errosPorCampo(erro))) {
      const chave = CAMPO_DO_SERVIDOR[campoServidor]
      if (!chave) continue
      erros[chave] = detalhado.codigo === 'QUANTIDADE_INTEIRA_OBRIGATORIA' ? mensagem : mensagemCampo
      mapeado = true
    }
    if (!mapeado) erroGeral.value = mensagem
  }

  return { campos, erros, erroGeral, opcoes, catalogo, rotuloQuantidade, validar, paraPayload, alterado, tratarErroApi }
}

export type FormularioNovoMaterialEstoque = ReturnType<typeof useFormularioNovoMaterialEstoque>
