import { computed, reactive, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { consultarCep } from '../services/viacep.service'
import { useBuscaCep } from './useBuscaCep'
import type { Funcionario, FuncionarioAtualizacao, FuncionarioPayload } from '../types'
import {
  dataBrParaIso,
  formatarMoeda,
  formatarTelefone,
  isoParaDataBr,
  mascararCep,
  mascararCpf,
  moedaParaNumero,
} from '../utils/formatadores'
import {
  FUNCOES,
  GRAUS_VINCULO,
  SETORES,
  SEXOS,
  TIPOS_CONTRATO,
  UFS,
  montarOpcoes,
} from '../utils/opcoes-funcionario'
import {
  IDADE_MINIMA_ANOS,
  anteriorAoNascimento,
  antesDaIdadeMinima,
  cpfValido,
  dataBrNoFuturo,
  dataBrValida,
  menorQueIdadeMinima,
  telefoneValido,
} from '../utils/validacao'

/** Valores exatamente como aparecem nos campos da tela (com máscara). */
export interface CamposFuncionario {
  nomeCompleto: string
  apelido: string
  cpf: string
  dataNascimento: string
  sexo: string
  celular: string
  cep: string
  cidade: string
  estado: string
  rua: string
  numero: string
  bairro: string
  complemento: string
  funcao: string
  setorAtuacao: string
  tipoContrato: string
  salario: string
  dataContratacao: string
  nomeContatoEmergencia: string
  contatoEmergencia: string
  grauVinculo: string
}

export type ErrosFuncionario = Partial<Record<keyof CamposFuncionario, string>>

const CHAVES: (keyof CamposFuncionario)[] = [
  'nomeCompleto', 'apelido', 'cpf', 'dataNascimento', 'sexo', 'celular', 'cep', 'cidade', 'estado',
  'rua', 'numero', 'bairro', 'complemento', 'funcao', 'setorAtuacao', 'tipoContrato', 'salario',
  'dataContratacao', 'nomeContatoEmergencia', 'contatoEmergencia', 'grauVinculo',
]

const SALARIO_MAXIMO = 99_999_999.99

function camposVazios(): CamposFuncionario {
  return Object.fromEntries(CHAVES.map((chave) => [chave, ''])) as unknown as CamposFuncionario
}

/** Funcionário da API -> texto dos campos (datas DD/MM/AAAA, salário em R$, máscaras aplicadas). */
function camposDoFuncionario(f: Funcionario): CamposFuncionario {
  return {
    nomeCompleto: f.nomeCompleto,
    apelido: f.apelido ?? '',
    cpf: mascararCpf(f.cpf),
    dataNascimento: isoParaDataBr(f.dataNascimento),
    sexo: f.sexo,
    celular: formatarTelefone(f.celular),
    cep: mascararCep(f.cep),
    cidade: f.cidade,
    estado: f.estado,
    rua: f.rua,
    numero: f.numero,
    bairro: f.bairro,
    complemento: f.complemento ?? '',
    funcao: f.funcao,
    setorAtuacao: f.setorAtuacao,
    tipoContrato: f.tipoContrato,
    salario: formatarMoeda(f.salario),
    dataContratacao: isoParaDataBr(f.dataContratacao),
    nomeContatoEmergencia: f.nomeContatoEmergencia,
    contatoEmergencia: formatarTelefone(f.contatoEmergencia),
    grauVinculo: f.grauVinculo,
  }
}

const digitos = (valor: string) => valor.replace(/\D/g, '')

/** Campos da tela -> formato da API (sem máscaras; opcionais vazios ficam como ''). Assume campos válidos. */
function normalizar(c: CamposFuncionario) {
  return {
    nomeCompleto: c.nomeCompleto.trim(),
    apelido: c.apelido.trim(),
    cpf: digitos(c.cpf),
    dataNascimento: dataBrParaIso(c.dataNascimento),
    sexo: c.sexo,
    celular: digitos(c.celular),
    cep: digitos(c.cep),
    cidade: c.cidade.trim(),
    estado: c.estado,
    rua: c.rua.trim(),
    numero: c.numero.trim(),
    bairro: c.bairro.trim(),
    complemento: c.complemento.trim(),
    funcao: c.funcao,
    setorAtuacao: c.setorAtuacao,
    salario: moedaParaNumero(c.salario) ?? 0,
    tipoContrato: c.tipoContrato,
    dataContratacao: dataBrParaIso(c.dataContratacao),
    contatoEmergencia: digitos(c.contatoEmergencia),
    nomeContatoEmergencia: c.nomeContatoEmergencia.trim(),
    grauVinculo: c.grauVinculo,
  }
}

type Normalizado = ReturnType<typeof normalizar>

// Campos com regra de formato que dados antigos (ex.: CPF 00000000000 do admin do seed) podem não cumprir.
const CAMPOS_FORMATO = ['cpf', 'celular', 'cep', 'contatoEmergencia'] as const

function validarCampos(c: CamposFuncionario, base: Normalizado | null = null): ErrosFuncionario {
  const erros: ErrosFuncionario = {}
  const obrigatorio = (chave: keyof CamposFuncionario, mensagem: string, max?: number) => {
    const valor = c[chave].trim()
    if (valor === '') erros[chave] = mensagem
    else if (max && valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
  }

  obrigatorio('nomeCompleto', 'Informe o nome completo.', 150)
  if (c.apelido.trim().length > 80) erros.apelido = 'Use no máximo 80 caracteres.'

  if (c.cpf === '') erros.cpf = 'Informe o CPF.'
  else if (!cpfValido(c.cpf)) erros.cpf = 'CPF inválido.'

  if (c.dataNascimento === '') erros.dataNascimento = 'Informe a data de nascimento.'
  else if (!dataBrValida(c.dataNascimento)) erros.dataNascimento = 'Data inválida. Use DD/MM/AAAA.'
  else if (dataBrNoFuturo(c.dataNascimento)) erros.dataNascimento = 'A data de nascimento não pode ser futura.'
  else if (menorQueIdadeMinima(c.dataNascimento)) {
    erros.dataNascimento = `O funcionário deve ter pelo menos ${IDADE_MINIMA_ANOS} anos.`
  }

  obrigatorio('sexo', 'Selecione o sexo.')

  if (c.celular === '') erros.celular = 'Informe o celular.'
  else if (!telefoneValido(c.celular)) erros.celular = 'Celular inválido. Use DDD + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular).'

  if (c.cep === '') erros.cep = 'Informe o CEP.'
  else if (digitos(c.cep).length !== 8) erros.cep = 'CEP inválido. Use 8 dígitos.'

  obrigatorio('cidade', 'Informe a cidade.', 100)
  if (c.estado === '') erros.estado = 'Selecione o estado.'
  else if (!UFS.includes(c.estado)) erros.estado = 'Estado inválido.'
  obrigatorio('rua', 'Informe a rua.', 150)
  obrigatorio('numero', 'Informe o número.', 20)
  obrigatorio('bairro', 'Informe o bairro.', 100)
  if (c.complemento.trim().length > 150) erros.complemento = 'Use no máximo 150 caracteres.'

  obrigatorio('funcao', 'Selecione a função.')
  obrigatorio('setorAtuacao', 'Selecione o setor de atuação.')
  obrigatorio('tipoContrato', 'Selecione o tipo de contrato.')

  const salario = moedaParaNumero(c.salario)
  if (salario === null) erros.salario = 'Informe o salário.'
  else if (salario < 0 || salario > SALARIO_MAXIMO) erros.salario = 'Salário inválido.'

  if (c.dataContratacao === '') erros.dataContratacao = 'Informe a data de contratação.'
  else if (!dataBrValida(c.dataContratacao)) erros.dataContratacao = 'Data inválida. Use DD/MM/AAAA.'
  else if (dataBrNoFuturo(c.dataContratacao)) erros.dataContratacao = 'A data de contratação não pode ser futura.'
  else if (dataBrValida(c.dataNascimento) && anteriorAoNascimento(c.dataContratacao, c.dataNascimento)) {
    erros.dataContratacao = 'A data de contratação não pode ser anterior ao nascimento.'
  } else if (dataBrValida(c.dataNascimento) && antesDaIdadeMinima(c.dataContratacao, c.dataNascimento)) {
    erros.dataContratacao = `A contratação só é possível a partir dos ${IDADE_MINIMA_ANOS} anos do funcionário.`
  }

  obrigatorio('nomeContatoEmergencia', 'Informe o nome do contato.', 150)
  if (c.contatoEmergencia === '') erros.contatoEmergencia = 'Informe o telefone de emergência.'
  else if (!telefoneValido(c.contatoEmergencia)) erros.contatoEmergencia = 'Telefone inválido. Use DDD + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular).'
  obrigatorio('grauVinculo', 'Selecione o grau de vínculo.')

  // Na edição, valor igual ao já salvo não é revalidado: não trava o PATCH dos outros campos.
  if (base) {
    for (const chave of CAMPOS_FORMATO) {
      if (digitos(c[chave]) === base[chave]) delete erros[chave]
    }

    // Datas antigas que não cumprem a regra de idade também seguem sem travar enquanto não forem mexidas.
    const nascimentoIgual = dataBrParaIso(c.dataNascimento) === base.dataNascimento
    if (nascimentoIgual) delete erros.dataNascimento
    // A contratação depende do nascimento: só some o erro se nenhum dos dois mudou.
    if (nascimentoIgual && dataBrParaIso(c.dataContratacao) === base.dataContratacao) delete erros.dataContratacao
  }

  return erros
}

/**
 * Estado, validação e conversão do formulário de funcionário.
 * Usado pela página de cadastro e pelo modal de edição (`inicial` preenche e serve de base para o diff do PATCH).
 */
export function useFormularioFuncionario(inicial?: Funcionario) {
  const campos = reactive<CamposFuncionario>(inicial ? camposDoFuncionario(inicial) : camposVazios())
  const erros = reactive<ErrosFuncionario>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicial ? normalizar(camposDoFuncionario(inicial)) : null

  // Opções de select: lista padrão + o valor já salvo (se for diferente), para não perder dado antigo.
  const opcoes = computed(() => ({
    sexo: montarOpcoes(SEXOS, inicial?.sexo),
    funcao: montarOpcoes(FUNCOES, inicial?.funcao),
    setorAtuacao: montarOpcoes(SETORES, inicial?.setorAtuacao),
    tipoContrato: montarOpcoes(TIPOS_CONTRATO, inicial?.tipoContrato),
    grauVinculo: montarOpcoes(GRAUS_VINCULO, inicial?.grauVinculo),
    estado: montarOpcoes(UFS, inicial?.estado),
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

  /** Valida tudo, preenche `erros` e devolve true se estiver tudo certo. */
  function validar(): boolean {
    erroGeral.value = null
    const resultado = validarCampos(campos, base)
    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  /** Corpo do POST: sem máscaras; apelido e complemento vazios são omitidos. */
  function paraPayload(): FuncionarioPayload {
    const { apelido, complemento, ...resto } = normalizar(campos)
    const payload: FuncionarioPayload = { ...resto }
    if (apelido) payload.apelido = apelido
    if (complemento) payload.complemento = complemento
    return payload
  }

  /** Corpo do PATCH: só os campos que mudaram em relação ao funcionário carregado. */
  function paraAtualizacao(): FuncionarioAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      // Opcional esvaziado vai como null (a API limpa o campo); '' ficaria gravado como texto vazio.
      alterados[chave] = (chave === 'apelido' || chave === 'complemento') && atual[chave] === '' ? null : atual[chave]
    }
    return alterados as FuncionarioAtualizacao
  }

  /** Interpreta o erro da API: 409 (CPF duplicado) vai para o campo CPF; o resto vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    if (status === 409) erros.cpf = mensagem
    else erroGeral.value = mensagem
  }

  const { buscandoCep, buscarCep } = useBuscaCep({ campos, erros, consultar: consultarCep, ufs: UFS })

  return { campos, erros, erroGeral, opcoes, buscandoCep, validar, paraPayload, paraAtualizacao, tratarErroApi, buscarCep }
}

export type FormularioFuncionario = ReturnType<typeof useFormularioFuncionario>
