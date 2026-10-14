import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import type { NovoMaterialEstoquePayload } from '../types/estoque'
import { limparEspacos } from '../utils/formatadores'
import {
  QUANTIDADE_MAXIMA,
  mensagemEstoque,
  quantidadeParaNumero,
} from '../utils/estoque'
import {
  LIMITE_CATEGORIA_MATERIAL,
  LIMITE_NOME_MATERIAL,
  LIMITE_UNIDADE_MATERIAL,
  opcoesCategoria,
  opcoesUnidade,
  simboloUnidade,
} from '../utils/materiais'

export interface CamposNovoMaterialEstoque {
  nome: string
  categoria: string
  unidade: string
  quantidade: string
}

export type ErrosNovoMaterialEstoque = Partial<Record<keyof CamposNovoMaterialEstoque, string>>

const CHAVES: (keyof CamposNovoMaterialEstoque)[] = ['nome', 'categoria', 'unidade', 'quantidade']

/** Formulário do modal "Adicionar Novo Material no Estoque" (`POST /estoque/materiais`). */
export function useFormularioNovoMaterialEstoque() {
  const campos = reactive<CamposNovoMaterialEstoque>({ nome: '', categoria: '', unidade: '', quantidade: '' })
  const erros = reactive<ErrosNovoMaterialEstoque>({})
  const erroGeral = shallowRef<string | null>(null)

  const opcoes = { categoria: opcoesCategoria(), unidade: opcoesUnidade() }

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
    else if (quantidade < 0.001) resultado.quantidade = 'A quantidade deve ser de pelo menos 0,001.'
    else if (quantidade > QUANTIDADE_MAXIMA) resultado.quantidade = 'Quantidade acima do limite permitido.'

    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  function paraPayload(): NovoMaterialEstoquePayload {
    return {
      nome: limparEspacos(campos.nome),
      categoria: campos.categoria,
      unidadeMedida: campos.unidade,
      quantidadeInicial: quantidadeParaNumero(campos.quantidade) ?? 0,
    }
  }

  const alterado = computed(() => CHAVES.some((chave) => campos[chave].trim() !== ''))

  function tratarErroApi(erro: unknown) {
    erroGeral.value = mensagemEstoque(extrairErro(erro).mensagem)
  }

  return { campos, erros, erroGeral, opcoes, rotuloQuantidade, validar, paraPayload, alterado, tratarErroApi }
}

export type FormularioNovoMaterialEstoque = ReturnType<typeof useFormularioNovoMaterialEstoque>
