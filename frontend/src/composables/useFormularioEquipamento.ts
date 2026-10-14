import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
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
  mensagemEquipamento,
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
    dataAquisicao: dataBrValida(c.data) ? dataBrParaIso(c.data) : c.data,
    valorAquisicao: moedaParaNumero(c.valor),
    fornecedorId: c.fornecedor === '' ? null : Number(c.fornecedor),
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposEquipamento, base: Normalizado | null): ErrosEquipamento {
  const erros: ErrosEquipamento = {}
  const obrigatorio = (chave: 'nome' | 'marca', mensagem: string, max: number) => {
    const valor = c[chave].trim()
    if (valor === '') erros[chave] = mensagem
    else if (valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
  }
  obrigatorio('nome', 'Informe o nome do equipamento.', LIMITE_NOME_EQUIPAMENTO)
  obrigatorio('marca', 'Informe a marca.', LIMITE_MARCA_EQUIPAMENTO)

  if (c.tipo === '') erros.tipo = 'Selecione o tipo.'
  else if (!TIPOS_EQUIPAMENTO.includes(c.tipo as TipoEquipamento) && c.tipo !== (base?.tipo ?? '')) {
    erros.tipo = 'Tipo inválido.'
  }

  if (c.modelo.trim().length > LIMITE_MODELO_EQUIPAMENTO) erros.modelo = `Use no máximo ${LIMITE_MODELO_EQUIPAMENTO} caracteres.`
  if (c.observacoes.trim().length > LIMITE_OBSERVACOES_EQUIPAMENTO) {
    erros.observacoes = `Use no máximo ${LIMITE_OBSERVACOES_EQUIPAMENTO} caracteres.`
  }

  if (c.data !== '') {
    if (!dataBrValida(c.data, ANO_MINIMO_AQUISICAO)) erros.data = 'Data inválida. Use DD/MM/AAAA.'
    else if (dataBrNoFuturo(c.data)) erros.data = 'A data de aquisição não pode ser futura.'
  } else if (base && base.dataAquisicao !== '') {
    // A API não consegue apagar a data depois de informada (null é ignorado): melhor avisar do que fingir que salvou.
    erros.data = 'A data de aquisição não pode ser removida depois de informada. Altere para outra data.'
  }

  if (c.valor !== '') {
    const valor = moedaParaNumero(c.valor)
    if (valor === null || valor < 0.01) erros.valor = 'O valor deve ser de pelo menos R$ 0,01.'
    else if (valor > VALOR_MAXIMO_EQUIPAMENTO) erros.valor = 'Valor acima do limite permitido.'
  } else if (base && base.valorAquisicao !== null) {
    erros.valor = 'O valor de aquisição não pode ser removido depois de informado. Altere para outro valor.'
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
   * Corpo do PATCH: só o que mudou. Modelo e observações esvaziados vão como '' (a API grava null) e o fornecedor
   * removido como null. Data e valor não são enviados vazios (a API não os apaga; a validação já avisou).
   */
  function paraAtualizacao(): EquipamentoAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      if ((chave === 'dataAquisicao' && atual[chave] === '') || (chave === 'valorAquisicao' && atual[chave] === null)) continue
      alterados[chave] = atual[chave]
    }
    return alterados as EquipamentoAtualizacao
  }

  const alterado = computed(() => {
    if (!base) return CHAVES.some((chave) => campos[chave].trim() !== '')
    // Apagar data/valor também conta como alteração: a validação do salvar explica por que não dá.
    const n = normalizar(campos)
    return (
      Object.keys(paraAtualizacao()).length > 0 ||
      n.dataAquisicao !== base.dataAquisicao ||
      n.valorAquisicao !== base.valorAquisicao
    )
  })

  function tratarErroApi(erro: unknown) {
    const mensagem = mensagemEquipamento(extrairErro(erro).mensagem)
    if (/data de aquisi/i.test(mensagem)) erros.data = mensagem
    else erroGeral.value = mensagem
  }

  return { campos, erros, erroGeral, opcoes, fornecedorAtual, validar, paraPayload, paraAtualizacao, alterado, tratarErroApi }
}

export type FormularioEquipamento = ReturnType<typeof useFormularioEquipamento>
