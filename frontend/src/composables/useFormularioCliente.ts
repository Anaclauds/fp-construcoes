import { computed, reactive, shallowRef, toRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { buscarEnderecoPorCep } from '../services/enderecos.service'
import type { Cliente, ClienteAtualizacao, ClientePayload, TipoCliente } from '../types'
import {
  dataBrParaIso,
  formatarTelefone,
  isoParaDataBr,
  mascararCep,
  mascararCnpj,
  mascararCpf,
} from '../utils/formatadores'
import {
  CARGOS_RESPONSAVEL,
  OPCOES_TIPO,
  SEXOS,
  UFS,
  montarOpcoes,
} from '../utils/opcoes-cliente'
import { cnpjValido, cpfValido, dataBrNoFuturo, dataBrValida, telefoneValido } from '../utils/validacao'
import { useBuscaCep } from './useBuscaCep'
import { useCidadesDoEstado } from './useCidadesDoEstado'

/** Valores exatamente como aparecem nos campos da tela (com máscara). */
export interface CamposCliente {
  /** '' = cadastro rápido (sem tipo): só nome, telefone, estado e cidade. */
  tipo: TipoCliente | ''
  /** PF: nome completo. Cadastro rápido: nome do cliente. */
  nome: string
  apelido: string
  cpf: string
  dataNascimento: string
  sexo: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  responsavel: string
  cargoResponsavel: string
  celular: string
  cep: string
  estado: string
  cidade: string
  rua: string
  numero: string
  bairro: string
  complemento: string
}

export type ErrosCliente = Partial<Record<keyof CamposCliente, string>>
export type ModoCliente = 'PF' | 'PJ' | 'rapido'

const CHAVES: (keyof CamposCliente)[] = [
  'tipo', 'nome', 'apelido', 'cpf', 'dataNascimento', 'sexo', 'razaoSocial', 'nomeFantasia', 'cnpj',
  'responsavel', 'cargoResponsavel', 'celular', 'cep', 'estado', 'cidade', 'rua', 'numero', 'bairro',
  'complemento',
]

/** Campos próprios de cada tipo: trocar PF <-> PJ descarta os do tipo anterior. */
const CAMPOS_DO_TIPO: Record<TipoCliente, (keyof CamposCliente)[]> = {
  PF: ['nome', 'apelido', 'cpf', 'dataNascimento', 'sexo'],
  PJ: ['razaoSocial', 'nomeFantasia', 'cnpj', 'responsavel', 'cargoResponsavel'],
}

const digitos = (valor: string) => valor.replace(/\D/g, '')
const modoDe = (tipo: CamposCliente['tipo']): ModoCliente => (tipo === '' ? 'rapido' : tipo)

function camposVazios(tipo: CamposCliente['tipo']): CamposCliente {
  const campos = Object.fromEntries(CHAVES.map((chave) => [chave, ''])) as unknown as CamposCliente
  campos.tipo = tipo
  return campos
}

/** Cliente da API -> texto dos campos (datas DD/MM/AAAA, máscaras aplicadas). */
function camposDoCliente(c: Cliente): CamposCliente {
  const ehPj = c.tipo === 'PJ'
  return {
    tipo: c.tipo ?? '',
    nome: ehPj ? '' : c.nome,
    apelido: c.apelido ?? '',
    cpf: c.tipo === 'PF' ? mascararCpf(c.cpfCnpj ?? '') : '',
    dataNascimento: c.dataNascimento ? isoParaDataBr(c.dataNascimento) : '',
    sexo: c.sexo ?? '',
    razaoSocial: ehPj ? (c.razaoSocial ?? c.nome) : '',
    nomeFantasia: c.nomeFantasia ?? '',
    cnpj: ehPj ? mascararCnpj(c.cpfCnpj ?? '') : '',
    responsavel: c.responsavel ?? '',
    cargoResponsavel: c.cargoResponsavel ?? '',
    celular: formatarTelefone(c.telefone),
    cep: c.cep ? mascararCep(c.cep) : '',
    estado: c.estado,
    cidade: c.cidade,
    rua: c.rua ?? '',
    numero: c.numero ?? '',
    bairro: c.bairro ?? '',
    complemento: c.complemento ?? '',
  }
}

/** Campos da tela -> formato da API para o tipo escolhido (sem máscaras; opcionais vazios ficam ''). Assume campos válidos. */
function normalizar(c: CamposCliente) {
  const comum = { telefone: digitos(c.celular), estado: c.estado, cidade: c.cidade.trim() }
  if (c.tipo === '') return { ...comum, nome: c.nome.trim() }

  const endereco = {
    cep: digitos(c.cep),
    rua: c.rua.trim(),
    numero: c.numero.trim(),
    bairro: c.bairro.trim(),
    complemento: c.complemento.trim(),
  }

  if (c.tipo === 'PF') {
    return {
      tipo: 'PF' as const,
      nome: c.nome.trim(),
      apelido: c.apelido.trim(),
      cpfCnpj: digitos(c.cpf),
      dataNascimento: dataBrParaIso(c.dataNascimento),
      sexo: c.sexo,
      ...comum,
      ...endereco,
    }
  }

  return {
    tipo: 'PJ' as const,
    // O backend grava `nome` = nome || razão social: enviar a razão social evita manter o nome de um cadastro rápido anterior.
    nome: c.razaoSocial.trim(),
    razaoSocial: c.razaoSocial.trim(),
    nomeFantasia: c.nomeFantasia.trim(),
    cpfCnpj: digitos(c.cnpj),
    responsavel: c.responsavel.trim(),
    cargoResponsavel: c.cargoResponsavel,
    ...comum,
    ...endereco,
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposCliente, base: Normalizado | null): ErrosCliente {
  const erros: ErrosCliente = {}
  const modo = modoDe(c.tipo)
  const obrigatorio = (chave: keyof CamposCliente, mensagem: string, max?: number) => {
    const valor = c[chave].trim()
    if (valor === '') erros[chave] = mensagem
    else if (max && valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
  }
  const opcionalAte = (chave: keyof CamposCliente, max: number) => {
    if (c[chave].trim().length > max) erros[chave] = `Use no máximo ${max} caracteres.`
  }

  if (modo === 'rapido') obrigatorio('nome', 'Informe o nome do cliente.', 180)

  if (c.celular === '') erros.celular = modo === 'rapido' ? 'Informe o telefone.' : 'Informe o celular.'
  else if (!telefoneValido(c.celular)) erros.celular = 'Telefone inválido. Use DDD + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular).'

  if (c.estado === '') erros.estado = 'Selecione o estado.'
  else if (!UFS.includes(c.estado)) erros.estado = 'Estado inválido.'
  obrigatorio('cidade', 'Selecione a cidade.', 100)

  if (modo === 'PF') {
    obrigatorio('nome', 'Informe o nome completo.', 180)
    opcionalAte('apelido', 80)

    if (c.cpf === '') erros.cpf = 'Informe o CPF.'
    else if (!cpfValido(c.cpf)) erros.cpf = 'CPF inválido.'

    if (c.dataNascimento === '') erros.dataNascimento = 'Informe a data.'
    else if (!dataBrValida(c.dataNascimento)) erros.dataNascimento = 'Data inválida. Use DD/MM/AAAA.'
    else if (dataBrNoFuturo(c.dataNascimento)) erros.dataNascimento = 'A data de nascimento não pode ser futura.'

    obrigatorio('sexo', 'Selecione o sexo.', 30)
  }

  if (modo === 'PJ') {
    obrigatorio('razaoSocial', 'Informe a razão social.', 180)
    obrigatorio('nomeFantasia', 'Informe o nome fantasia.', 150)

    if (c.cnpj === '') erros.cnpj = 'Informe o CNPJ.'
    else if (!cnpjValido(c.cnpj)) erros.cnpj = 'CNPJ inválido.'

    obrigatorio('responsavel', 'Informe o responsável.', 150)
    obrigatorio('cargoResponsavel', 'Selecione o cargo do responsável.', 100)
  }

  if (modo !== 'rapido') {
    if (c.cep === '') erros.cep = 'Informe o CEP.'
    else if (digitos(c.cep).length !== 8) erros.cep = 'CEP inválido. Use 8 dígitos.'

    obrigatorio('rua', 'Informe a rua.', 150)
    obrigatorio('numero', 'Informe o número.', 20)
    obrigatorio('bairro', 'Informe o bairro.', 100)
    opcionalAte('complemento', 150)
  }

  // Na edição, valor igual ao já salvo não é revalidado: dado antigo fora do padrão não trava o PATCH.
  if (base) {
    const salvo = base as Partial<Record<string, string>>
    if (digitos(c.celular) === salvo.telefone) delete erros.celular
    if (digitos(c.cep) === salvo.cep) delete erros.cep
    if (digitos(modo === 'PJ' ? c.cnpj : c.cpf) === salvo.cpfCnpj) {
      delete erros.cpf
      delete erros.cnpj
    }
    if (modo === 'PF' && dataBrValida(c.dataNascimento) && dataBrParaIso(c.dataNascimento) === salvo.dataNascimento) {
      delete erros.dataNascimento
    }
  }

  return erros
}

/**
 * Estado, validação e conversão do formulário de cliente.
 * - `inicial`: cliente já cadastrado (edição); sem ele é um cadastro novo.
 * - `tipoInicial`: tipo de um cadastro novo (`'PF'` na página; `''` = cadastro rápido).
 * Usado pela página de cadastro, pelo modal de edição e pelo modal de cadastro rápido.
 */
export function useFormularioCliente(inicial?: Cliente | null, tipoInicial: CamposCliente['tipo'] = 'PF') {
  const campos = reactive<CamposCliente>(inicial ? camposDoCliente(inicial) : camposVazios(tipoInicial))
  const erros = reactive<ErrosCliente>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicial ? normalizar(camposDoCliente(inicial)) : null
  const baseSerializada = base ? JSON.stringify(base) : null

  const modo = computed(() => modoDe(campos.tipo))

  // Opções de select: lista padrão + o valor já salvo (se for diferente), para não perder dado antigo.
  const opcoes = computed(() => ({
    tipo: OPCOES_TIPO,
    sexo: montarOpcoes(SEXOS, inicial?.sexo ?? ''),
    cargoResponsavel: montarOpcoes(CARGOS_RESPONSAVEL, inicial?.cargoResponsavel ?? ''),
    estado: montarOpcoes(UFS, inicial?.estado),
  }))

  const cidades = useCidadesDoEstado(toRef(campos, 'estado'), toRef(campos, 'cidade'))

  // Mexeu no campo: o erro daquele campo some até a próxima validação.
  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
      },
    )
  }

  /** O usuário escolheu outro estado: a cidade anterior não vale mais. (A busca de CEP preenche os dois direto.) */
  function aoMudarEstado(uf: string) {
    if (uf === campos.estado) return
    campos.estado = uf
    campos.cidade = ''
  }

  /** Alguma informação própria do tipo atual já foi preenchida (trocar de tipo a descartaria). */
  const temDadosDoTipo = computed(() =>
    campos.tipo === '' ? false : CAMPOS_DO_TIPO[campos.tipo].some((chave) => campos[chave].trim() !== ''),
  )

  /** Troca PF <-> PJ: descarta os campos do tipo anterior; celular e endereço continuam. */
  function trocarTipo(novo: TipoCliente) {
    if (campos.tipo === novo) return
    const doRapido = campos.tipo === ''
    for (const chave of [...CAMPOS_DO_TIPO.PF, ...CAMPOS_DO_TIPO.PJ]) {
      // Do cadastro rápido para PF, o nome já digitado vira o nome completo.
      if (doRapido && novo === 'PF' && chave === 'nome') continue
      campos[chave] = ''
      erros[chave] = undefined
    }
    campos.tipo = novo
  }

  /** Valida o que o tipo atual exige, preenche `erros` e devolve true se estiver tudo certo. */
  function validar(): boolean {
    erroGeral.value = null
    const resultado = validarCampos(campos, base)
    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  /** Há diferença em relação ao cliente carregado (ou, num cadastro novo, algo foi preenchido). */
  const alterado = computed(() => {
    if (baseSerializada !== null) return JSON.stringify(normalizar(campos)) !== baseSerializada
    return CHAVES.some((chave) => chave !== 'tipo' && campos[chave].trim() !== '')
  })

  /** Corpo do POST: sem máscaras; opcionais vazios (apelido, complemento) são omitidos. */
  function paraPayload(): ClientePayload {
    const payload: Record<string, unknown> = { ...normalizar(campos) }
    for (const chave of ['apelido', 'complemento']) {
      if (payload[chave] === '') delete payload[chave]
    }
    return payload as unknown as ClientePayload
  }

  /**
   * Corpo do PATCH. O backend revalida o cadastro inteiro a cada alteração, então vai sempre o objeto
   * completo do tipo (e o endereço completo, para o CEP não refazer rua/bairro). Opcional esvaziado vai como null.
   */
  function paraAtualizacao(): ClienteAtualizacao {
    const payload: Record<string, unknown> = { ...normalizar(campos) }
    for (const chave of ['apelido', 'complemento']) {
      if (payload[chave] === '') payload[chave] = null
    }
    return payload as unknown as ClienteAtualizacao
  }

  /** Interpreta o erro da API: 409 (CPF/CNPJ duplicado) e erros de CEP vão para o campo; o resto vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    // A API responde "CPF/CNPJ ja cadastrado..." (sem acento e sem dizer qual): o texto do campo é específico.
    if (status === 409) {
      const ehPj = campos.tipo === 'PJ'
      erros[ehPj ? 'cnpj' : 'cpf'] = `${ehPj ? 'CNPJ' : 'CPF'} já cadastrado para outro cliente.`
    } else if (/\bcep\b/i.test(mensagem)) {
      erros.cep = mensagem
    } else {
      erroGeral.value = mensagem
    }
  }

  const { buscandoCep, buscarCep } = useBuscaCep({
    campos,
    erros,
    consultar: buscarEnderecoPorCep,
    ufs: UFS,
    mensagemFalha: (e) => (e instanceof Error ? e.message : 'Não foi possível consultar o CEP.'),
  })

  return {
    campos,
    erros,
    erroGeral,
    modo,
    opcoes,
    cidades,
    buscandoCep,
    alterado,
    temDadosDoTipo,
    aoMudarEstado,
    trocarTipo,
    validar,
    paraPayload,
    paraAtualizacao,
    tratarErroApi,
    buscarCep,
  }
}

export type FormularioCliente = ReturnType<typeof useFormularioCliente>
