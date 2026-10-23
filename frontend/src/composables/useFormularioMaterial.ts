import { computed, reactive, shallowRef, watch } from 'vue'
import { errosPorCampo, extrairErro } from '../services/api'
import type { Material, MaterialAtualizacao, MaterialPayload } from '../types/material'
import { formatarMoeda, moedaParaNumero, limparEspacos } from '../utils/formatadores'
import {
  LIMITE_CATEGORIA_MATERIAL,
  LIMITE_DESCRICAO_MATERIAL,
  LIMITE_NOME_MATERIAL,
  LIMITE_UNIDADE_MATERIAL,
  VALOR_MAXIMO_MATERIAL,
  categoriaParaOpcao,
  mensagemMaterial,
  opcoesDeCatalogo,
  unidadeParaOpcao,
} from '../utils/materiais'
import { useCatalogoMaterial } from './useCatalogoMaterial'

/** Valores exatamente como aparecem nos campos (preço já com máscara de moeda; fornecedor = id em texto). */
export interface CamposMaterial {
  nome: string
  categoria: string
  unidade: string
  descricao: string
  preco: string
  fornecedor: string
}

export type ErrosMaterial = Partial<Record<keyof CamposMaterial, string>>

const CHAVES: (keyof CamposMaterial)[] = ['nome', 'categoria', 'unidade', 'descricao', 'preco', 'fornecedor']

function camposDoMaterial(m: Material): CamposMaterial {
  return {
    nome: m.nome,
    categoria: categoriaParaOpcao(m.categoria),
    unidade: unidadeParaOpcao(m.unidadeMedida),
    descricao: m.descricao ?? '',
    preco: formatarMoeda(m.precoReferencia),
    fornecedor: m.fornecedorPreferencialId === null ? '' : String(m.fornecedorPreferencialId),
  }
}

function normalizar(c: CamposMaterial) {
  return {
    nome: limparEspacos(c.nome),
    categoria: c.categoria.trim(),
    unidadeMedida: c.unidade.trim(),
    descricao: c.descricao.trim(),
    precoReferencia: moedaParaNumero(c.preco) ?? 0,
    fornecedorPreferencialId: c.fornecedor === '' ? null : Number(c.fornecedor),
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposMaterial, base: Normalizado | null): ErrosMaterial {
  const erros: ErrosMaterial = {}
  const nome = c.nome.trim()
  if (nome === '') erros.nome = 'Informe o nome do material.'
  else if (nome.length > LIMITE_NOME_MATERIAL) erros.nome = `Use no máximo ${LIMITE_NOME_MATERIAL} caracteres.`

  const categoria = c.categoria.trim()
  if (categoria === '') erros.categoria = 'Selecione a categoria.'
  else if (categoria.length > LIMITE_CATEGORIA_MATERIAL) erros.categoria = `Use no máximo ${LIMITE_CATEGORIA_MATERIAL} caracteres.`

  const unidade = c.unidade.trim()
  if (unidade === '') erros.unidade = 'Selecione a unidade de medida.'
  else if (unidade.length > LIMITE_UNIDADE_MATERIAL) erros.unidade = `Use no máximo ${LIMITE_UNIDADE_MATERIAL} caracteres.`

  if (c.descricao.trim().length > LIMITE_DESCRICAO_MATERIAL) {
    erros.descricao = `Use no máximo ${LIMITE_DESCRICAO_MATERIAL} caracteres.`
  }

  const preco = moedaParaNumero(c.preco)
  if (preco === null) erros.preco = 'Informe o preço unitário.'
  else if (preco < 0.01) erros.preco = 'O preço deve ser de pelo menos R$ 0,01.'
  else if (preco > VALOR_MAXIMO_MATERIAL) erros.preco = 'Valor acima do limite permitido.'

  // Preço antigo fora da regra atual (ex.: material criado pelo estoque, sem preço) não trava a edição de outros campos.
  if (base && preco === base.precoReferencia) delete erros.preco
  return erros
}

/**
 * Estado, validação e conversão do formulário de material.
 * Usado pela página de cadastro e pelo modal de edição (`inicial` preenche e serve de base para o PATCH só com o que mudou).
 */
export function useFormularioMaterial(inicial?: Material) {
  const inicialCampos = inicial ? camposDoMaterial(inicial) : null
  const campos = reactive<CamposMaterial>(
    inicialCampos ? { ...inicialCampos } : { nome: '', categoria: '', unidade: '', descricao: '', preco: '', fornecedor: '' },
  )
  const erros = reactive<ErrosMaterial>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicialCampos ? normalizar(inicialCampos) : null

  // Categorias e unidades vêm do catálogo da API; o valor já salvo no material aparece mesmo se não estiver nele.
  const catalogo = useCatalogoMaterial()
  const opcoes = computed(() => ({
    categoria: opcoesDeCatalogo(catalogo.categorias.value, inicialCampos?.categoria),
    unidade: opcoesDeCatalogo(catalogo.unidades.value, inicialCampos?.unidade),
  }))

  // Fornecedor atual do material (mesmo inativo): aparece como selecionado mesmo fora da lista de ativos.
  const fornecedorAtual = inicial?.fornecedorPreferencial ?? null

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
    const resultado = validarCampos(campos, base)
    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  /** Corpo do POST: descrição vazia e fornecedor ausente são omitidos. */
  function paraPayload(): MaterialPayload {
    const { descricao, fornecedorPreferencialId, ...resto } = normalizar(campos)
    const payload: MaterialPayload = { ...resto }
    if (descricao) payload.descricao = descricao
    if (fornecedorPreferencialId !== null) payload.fornecedorPreferencialId = fornecedorPreferencialId
    return payload
  }

  /** Corpo do PATCH: só o que mudou; descrição esvaziada vai como '' e fornecedor removido como null. */
  function paraAtualizacao(): MaterialAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      alterados[chave] = atual[chave]
    }
    return alterados as MaterialAtualizacao
  }

  const alterado = computed(() =>
    base ? Object.keys(paraAtualizacao()).length > 0 : CHAVES.some((chave) => campos[chave].trim() !== ''),
  )

  /** Campo do DTO (`precoReferencia`...) -> campo do formulário. */
  const CAMPO_DO_SERVIDOR: Record<string, keyof CamposMaterial> = {
    nome: 'nome',
    categoria: 'categoria',
    unidadeMedida: 'unidade',
    descricao: 'descricao',
    precoReferencia: 'preco',
    fornecedorPreferencialId: 'fornecedor',
  }

  /** Erros do servidor vão para o campo citado; o que não tem campo vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    erroGeral.value = null
    let mapeado = false
    for (const [campoServidor, mensagem] of Object.entries(errosPorCampo(erro))) {
      const chave = CAMPO_DO_SERVIDOR[campoServidor]
      if (!chave) continue
      erros[chave] = mensagemMaterial(mensagem)
      mapeado = true
    }
    if (!mapeado) erroGeral.value = mensagemMaterial(extrairErro(erro).mensagem)
  }

  return { campos, erros, erroGeral, opcoes, catalogo, fornecedorAtual, validar, paraPayload, paraAtualizacao, alterado, tratarErroApi }
}

export type FormularioMaterial = ReturnType<typeof useFormularioMaterial>
