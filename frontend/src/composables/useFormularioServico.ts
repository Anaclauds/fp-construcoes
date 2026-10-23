import { computed, reactive, shallowRef, watch } from 'vue'
import { errosPorCampo, extrairErro } from '../services/api'
import type { TipoOrcamento } from '../types'
import type { Servico, ServicoAtualizacao, ServicoPayload } from '../types/servico'
import { formatarMoeda, moedaParaNumero, limparEspacos } from '../utils/formatadores'
import { OPCOES_TIPO_ORCAMENTO } from '../utils/orcamentos'
import {
  LIMITE_DESCRICAO_SERVICO,
  LIMITE_NOME_SERVICO,
  LIMITE_UNIDADE_SERVICO,
  VALOR_MAXIMO_SERVICO,
  interpretarErroServico,
  opcoesUnidade,
  unidadeParaOpcao,
} from '../utils/servicos'

/** Valores exatamente como aparecem nos campos (valor já com máscara de moeda). */
export interface CamposServico {
  nome: string
  categoria: string
  descricao: string
  valor: string
  unidade: string
}

export type ErrosServico = Partial<Record<keyof CamposServico, string>>

const CHAVES: (keyof CamposServico)[] = ['nome', 'categoria', 'descricao', 'valor', 'unidade']

function camposDoServico(s: Servico): CamposServico {
  return {
    nome: s.nome,
    categoria: s.categoria,
    descricao: s.descricao ?? '',
    valor: formatarMoeda(s.valorReferencia),
    unidade: unidadeParaOpcao(s.unidadeMedida),
  }
}

function normalizar(c: CamposServico) {
  return {
    nome: limparEspacos(c.nome),
    categoria: c.categoria,
    descricao: c.descricao.trim(),
    valorReferencia: moedaParaNumero(c.valor) ?? 0,
    unidadeMedida: c.unidade.trim(),
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposServico, base: Normalizado | null): ErrosServico {
  const erros: ErrosServico = {}
  const nome = c.nome.trim()
  if (nome === '') erros.nome = 'Informe o nome do serviço.'
  else if (nome.length > LIMITE_NOME_SERVICO) erros.nome = `Use no máximo ${LIMITE_NOME_SERVICO} caracteres.`

  if (c.categoria === '') erros.categoria = 'Selecione a categoria.'
  else if (!OPCOES_TIPO_ORCAMENTO.some((o) => o.valor === c.categoria)) erros.categoria = 'Categoria inválida.'

  if (c.descricao.trim().length > LIMITE_DESCRICAO_SERVICO) {
    erros.descricao = `Use no máximo ${LIMITE_DESCRICAO_SERVICO} caracteres.`
  }

  const valor = moedaParaNumero(c.valor)
  if (valor === null) erros.valor = 'Informe o valor unitário.'
  else if (valor < 0.01) erros.valor = 'O valor deve ser de pelo menos R$ 0,01.'
  else if (valor > VALOR_MAXIMO_SERVICO) erros.valor = 'Valor acima do limite permitido.'

  const unidade = c.unidade.trim()
  if (unidade === '') erros.unidade = 'Selecione a unidade de medida.'
  else if (unidade.length > LIMITE_UNIDADE_SERVICO) {
    erros.unidade = `Use no máximo ${LIMITE_UNIDADE_SERVICO} caracteres.`
  }

  // Valor antigo fora da regra atual não trava a edição de outros campos enquanto não for mexido.
  if (base && valor === base.valorReferencia) delete erros.valor
  return erros
}

/**
 * Estado, validação e conversão do formulário de serviço.
 * Usado pela página de cadastro e pelo modal de edição (`inicial` preenche e serve de base para o diff do PATCH).
 */
export function useFormularioServico(inicial?: Servico) {
  const inicialCampos = inicial ? camposDoServico(inicial) : null
  const campos = reactive<CamposServico>(
    inicialCampos ? { ...inicialCampos } : { nome: '', categoria: '', descricao: '', valor: '', unidade: '' },
  )
  const erros = reactive<ErrosServico>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicialCampos ? normalizar(inicialCampos) : null

  const opcoes = computed(() => ({
    categoria: OPCOES_TIPO_ORCAMENTO,
    unidade: opcoesUnidade(inicialCampos?.unidade),
  }))

  // Mexeu no campo: o erro daquele campo some até a próxima validação.
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

  /** Corpo do POST: descrição vazia é omitida (a API grava NULL). */
  function paraPayload(): ServicoPayload {
    const { descricao, categoria, ...resto } = normalizar(campos)
    const payload: ServicoPayload = { ...resto, categoria: categoria as TipoOrcamento }
    if (descricao) payload.descricao = descricao
    return payload
  }

  /** Corpo do PATCH: só o que mudou; descrição esvaziada vai como '' para limpar o campo. */
  function paraAtualizacao(): ServicoAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      alterados[chave] = atual[chave]
    }
    return alterados as ServicoAtualizacao
  }

  const alterado = computed(() =>
    base ? Object.keys(paraAtualizacao()).length > 0 : CHAVES.some((chave) => campos[chave].trim() !== ''),
  )

  /** Campo do DTO -> campo do formulário. */
  const CAMPO_DO_SERVIDOR: Record<string, keyof CamposServico> = {
    nome: 'nome',
    categoria: 'categoria',
    descricao: 'descricao',
    valorReferencia: 'valor',
    unidadeMedida: 'unidade',
  }

  /** Erros de negócio (por `codigo`) e de validação (por campo) vão para o campo citado; o que não tem campo vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    erroGeral.value = null
    const interpretado = interpretarErroServico(extrairErro(erro))
    if (interpretado.campo) {
      erros[interpretado.campo] = interpretado.mensagem
      return
    }
    let mapeado = false
    for (const [campoServidor, mensagem] of Object.entries(errosPorCampo(erro))) {
      const chave = CAMPO_DO_SERVIDOR[campoServidor]
      if (!chave) continue
      erros[chave] = mensagem
      mapeado = true
    }
    if (!mapeado) erroGeral.value = interpretado.mensagem
  }

  return { campos, erros, erroGeral, opcoes, validar, paraPayload, paraAtualizacao, alterado, tratarErroApi }
}

export type FormularioServico = ReturnType<typeof useFormularioServico>
