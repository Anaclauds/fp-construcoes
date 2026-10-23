import { computed, reactive, shallowRef, watch } from 'vue'
import { errosPorCampo, extrairErro } from '../services/api'
import type { Equipamento, EquipamentoAtualizacao, EquipamentoPayload, TipoEquipamento } from '../types/equipamento'
import { dataBrParaIso, formatarMoeda, isoParaDataBr, moedaParaNumero, limparEspacos } from '../utils/formatadores'
import {
  ANO_MINIMO_AQUISICAO,
  LIMITE_MARCA_EQUIPAMENTO,
  LIMITE_MODELO_EQUIPAMENTO,
  LIMITE_NOME_EQUIPAMENTO,
  LIMITE_OBSERVACOES_EQUIPAMENTO,
  TIPOS_EQUIPAMENTO,
  VALOR_MAXIMO_EQUIPAMENTO,
  interpretarErroEquipamento,
  opcoesTipoEquipamento,
} from '../utils/equipamentos'
import { dataBrNoFuturo, dataBrValida } from '../utils/validacao'

/** Valores exatamente como aparecem nos campos (data DD/MM/AAAA, valor com máscara, fornecedor = id em texto). */
export interface CamposEquipamento {
  nome: string
  tipo: string
  marca: string
  modelo: string
  observacoes: string
  data: string
  valor: string
  fornecedor: string
}

export type ErrosEquipamento = Partial<Record<keyof CamposEquipamento, string>>

const CHAVES: (keyof CamposEquipamento)[] = ['nome', 'tipo', 'marca', 'modelo', 'observacoes', 'data', 'valor', 'fornecedor']

function camposDoEquipamento(e: Equipamento): CamposEquipamento {
  return {
    nome: e.nome,
    tipo: e.tipo,
    marca: e.marca,
    modelo: e.modelo ?? '',
    observacoes: e.observacoes ?? '',
    data: e.dataAquisicao ? isoParaDataBr(e.dataAquisicao) : '',
    valor: e.valorAquisicao === null ? '' : formatarMoeda(e.valorAquisicao),
    fornecedor: e.fornecedorId === null ? '' : String(e.fornecedorId),
  }
}

function normalizar(c: CamposEquipamento) {
  return {
    nome: limparEspacos(c.nome),
    tipo: c.tipo,
    marca: limparEspacos(c.marca),
    modelo: limparEspacos(c.modelo),
    observacoes: c.observacoes.trim(),
    // Vazio vira null: no PATCH limpa o campo, no POST é omitido.
    dataAquisicao: c.data === '' ? null : dataBrValida(c.data) ? dataBrParaIso(c.data) : c.data,
    valorAquisicao: moedaParaNumero(c.valor),
    fornecedorId: c.fornecedor === '' ? null : Number(c.fornecedor),
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposEquipamento, base: Normalizado | null): ErrosEquipamento {
  const erros: ErrosEquipamento = {}
  const atual = normalizar(c)
  // O PATCH só leva o que mudou: texto antigo que já excede o limite (cadastro anterior) não bloqueia a edição de outros campos.
  const excede = (chave: 'nome' | 'marca' | 'modelo' | 'observacoes', max: number) =>
    atual[chave].length > max && (base === null || atual[chave] !== base[chave])
  const obrigatorio = (chave: 'nome' | 'marca', mensagem: string, max: number) => {
    if (atual[chave] === '') erros[chave] = mensagem
    else if (excede(chave, max)) erros[chave] = `Use no máximo ${max} caracteres.`
  }
  obrigatorio('nome', 'Informe o nome do equipamento.', LIMITE_NOME_EQUIPAMENTO)
  obrigatorio('marca', 'Informe a marca.', LIMITE_MARCA_EQUIPAMENTO)

  if (c.tipo === '') erros.tipo = 'Selecione o tipo.'
  else if (!TIPOS_EQUIPAMENTO.includes(c.tipo as TipoEquipamento) && c.tipo !== (base?.tipo ?? '')) {
    erros.tipo = 'Tipo inválido.'
  }

  if (excede('modelo', LIMITE_MODELO_EQUIPAMENTO)) erros.modelo = `Use no máximo ${LIMITE_MODELO_EQUIPAMENTO} caracteres.`
  if (excede('observacoes', LIMITE_OBSERVACOES_EQUIPAMENTO)) {
    erros.observacoes = `Use no máximo ${LIMITE_OBSERVACOES_EQUIPAMENTO} caracteres.`
  }

  if (c.data !== '') {
    if (!dataBrValida(c.data, ANO_MINIMO_AQUISICAO)) erros.data = 'Data inválida. Use DD/MM/AAAA.'
    else if (dataBrNoFuturo(c.data)) erros.data = 'A data de aquisição não pode ser futura.'
  }

  if (c.valor !== '') {
    const valor = moedaParaNumero(c.valor)
    if (valor === null || valor < 0.01) erros.valor = 'O valor deve ser de pelo menos R$ 0,01.'
    else if (valor > VALOR_MAXIMO_EQUIPAMENTO) erros.valor = 'Valor acima do limite permitido.'
  }

  return erros
}

/**
 * Estado, validação e conversão do formulário de equipamento.
 * Usado pela página de cadastro e pelo modal de edição (`inicial` preenche e serve de base para o PATCH só com o que mudou).
 */
export function useFormularioEquipamento(inicial?: Equipamento) {
  const inicialCampos = inicial ? camposDoEquipamento(inicial) : null
  const campos = reactive<CamposEquipamento>(
    inicialCampos
      ? { ...inicialCampos }
      : { nome: '', tipo: '', marca: '', modelo: '', observacoes: '', data: '', valor: '', fornecedor: '' },
  )
  const erros = reactive<ErrosEquipamento>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicialCampos ? normalizar(inicialCampos) : null

  const opcoes = computed(() => ({ tipo: opcoesTipoEquipamento(inicial?.tipo) }))
  const fornecedorAtual = inicial?.fornecedor ?? null

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

  /** Corpo do POST: opcionais vazios são omitidos. */
  function paraPayload(): EquipamentoPayload {
    const n = normalizar(campos)
    const payload: EquipamentoPayload = { nome: n.nome, tipo: n.tipo as TipoEquipamento, marca: n.marca }
    if (n.modelo) payload.modelo = n.modelo
    if (n.observacoes) payload.observacoes = n.observacoes
    if (n.dataAquisicao) payload.dataAquisicao = n.dataAquisicao
    if (n.valorAquisicao !== null) payload.valorAquisicao = n.valorAquisicao
    if (n.fornecedorId !== null) payload.fornecedorId = n.fornecedorId
    return payload
  }

  /**
   * Corpo do PATCH: só o que mudou. Os opcionais esvaziados vão como null (a API limpa o campo); nome, tipo e marca
   * são obrigatórios e a validação já impede que vão vazios.
   */
  function paraAtualizacao(): EquipamentoAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      const vazio = chave === 'modelo' || chave === 'observacoes' ? atual[chave] === '' : false
      alterados[chave] = vazio ? null : atual[chave]
    }
    return alterados as EquipamentoAtualizacao
  }

  const alterado = computed(() =>
    base ? Object.keys(paraAtualizacao()).length > 0 : CHAVES.some((chave) => campos[chave].trim() !== ''),
  )

  /** Campo do DTO -> campo do formulário. */
  const CAMPO_DO_SERVIDOR: Record<string, keyof CamposEquipamento> = {
    nome: 'nome',
    tipo: 'tipo',
    marca: 'marca',
    modelo: 'modelo',
    observacoes: 'observacoes',
    dataAquisicao: 'data',
    valorAquisicao: 'valor',
    fornecedorId: 'fornecedor',
  }

  /** Erros de negócio (por `codigo`) e de validação (por campo) vão para o campo citado; o que não tem campo vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    erroGeral.value = null
    const interpretado = interpretarErroEquipamento(extrairErro(erro))
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

  return { campos, erros, erroGeral, opcoes, fornecedorAtual, validar, paraPayload, paraAtualizacao, alterado, tratarErroApi }
}

export type FormularioEquipamento = ReturnType<typeof useFormularioEquipamento>
