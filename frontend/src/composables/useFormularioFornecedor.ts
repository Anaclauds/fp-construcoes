import { computed, reactive, shallowRef, toRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { buscarEnderecoPorCep } from '../services/enderecos.service'
import type { Fornecedor, FornecedorAtualizacao, FornecedorPayload } from '../types/fornecedor'
import { formatarTelefone, mascararCep, mascararCnpj, limparEspacos } from '../utils/formatadores'
import {
  LIMITE_BAIRRO,
  LIMITE_CARGO,
  LIMITE_CIDADE,
  LIMITE_COMPLEMENTO,
  LIMITE_NOME_FANTASIA,
  LIMITE_NUMERO,
  LIMITE_RAZAO_SOCIAL,
  LIMITE_RESPONSAVEL,
  LIMITE_RUA,
  mensagemFornecedor,
} from '../utils/fornecedores'
import { CARGOS_RESPONSAVEL, UFS, montarOpcoes } from '../utils/opcoes-cliente'
import { cnpjValido, telefoneValido } from '../utils/validacao'
import { useBuscaCep } from './useBuscaCep'
import { useCidadesDoEstado } from './useCidadesDoEstado'

/** Valores exatamente como aparecem nos campos (com máscara). */
export interface CamposFornecedor {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  contato: string
  responsavel: string
  cargoResponsavel: string
  cep: string
  estado: string
  cidade: string
  rua: string
  numero: string
  bairro: string
  complemento: string
}

export type ErrosFornecedor = Partial<Record<keyof CamposFornecedor, string>>

const CHAVES: (keyof CamposFornecedor)[] = [
  'razaoSocial', 'nomeFantasia', 'cnpj', 'contato', 'responsavel', 'cargoResponsavel',
  'cep', 'estado', 'cidade', 'rua', 'numero', 'bairro', 'complemento',
]

const digitos = (valor: string) => valor.replace(/\D/g, '')

function camposDoFornecedor(f: Fornecedor): CamposFornecedor {
  return {
    razaoSocial: f.razaoSocial,
    nomeFantasia: f.nomeFantasia,
    cnpj: mascararCnpj(f.cnpj),
    contato: formatarTelefone(f.contato),
    responsavel: f.responsavel,
    cargoResponsavel: f.cargoResponsavel,
    cep: mascararCep(f.cep),
    estado: f.estado,
    cidade: f.cidade,
    rua: f.rua,
    numero: f.numero,
    bairro: f.bairro,
    complemento: f.complemento ?? '',
  }
}

/** Campos da tela -> formato da API (sem máscaras; complemento vazio fica ''). */
function normalizar(c: CamposFornecedor) {
  return {
    razaoSocial: limparEspacos(c.razaoSocial),
    nomeFantasia: limparEspacos(c.nomeFantasia),
    cnpj: digitos(c.cnpj),
    contato: digitos(c.contato),
    responsavel: limparEspacos(c.responsavel),
    cargoResponsavel: c.cargoResponsavel,
    cep: digitos(c.cep),
    cidade: c.cidade.trim(),
    estado: c.estado,
    rua: c.rua.trim(),
    numero: c.numero.trim(),
    bairro: c.bairro.trim(),
    complemento: c.complemento.trim(),
  }
}

type Normalizado = ReturnType<typeof normalizar>

function validarCampos(c: CamposFornecedor, base: Normalizado | null): ErrosFornecedor {
  const erros: ErrosFornecedor = {}
  const obrigatorio = (chave: keyof CamposFornecedor, mensagem: string, max: number) => {
    const valor = c[chave].trim()
    if (valor === '') erros[chave] = mensagem
    else if (valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
  }

  obrigatorio('razaoSocial', 'Informe a razão social.', LIMITE_RAZAO_SOCIAL)
  obrigatorio('nomeFantasia', 'Informe o nome fantasia.', LIMITE_NOME_FANTASIA)

  if (c.cnpj === '') erros.cnpj = 'Informe o CNPJ.'
  else if (!cnpjValido(c.cnpj)) erros.cnpj = 'CNPJ inválido.'

  if (c.contato === '') erros.contato = 'Informe o contato.'
  else if (!telefoneValido(c.contato)) {
    erros.contato = 'Telefone inválido. Use DDD + 8 dígitos (fixo) ou 9 dígitos começando com 9 (celular).'
  }

  obrigatorio('responsavel', 'Informe o responsável.', LIMITE_RESPONSAVEL)
  obrigatorio('cargoResponsavel', 'Selecione o cargo do responsável.', LIMITE_CARGO)

  if (c.cep === '') erros.cep = 'Informe o CEP.'
  else if (digitos(c.cep).length !== 8) erros.cep = 'CEP inválido. Use 8 dígitos.'

  if (c.estado === '') erros.estado = 'Selecione o estado.'
  else if (!UFS.includes(c.estado)) erros.estado = 'Estado inválido.'
  obrigatorio('cidade', 'Selecione a cidade.', LIMITE_CIDADE)
  obrigatorio('rua', 'Informe a rua.', LIMITE_RUA)
  obrigatorio('numero', 'Informe o número.', LIMITE_NUMERO)
  obrigatorio('bairro', 'Informe o bairro.', LIMITE_BAIRRO)
  if (c.complemento.trim().length > LIMITE_COMPLEMENTO) erros.complemento = `Use no máximo ${LIMITE_COMPLEMENTO} caracteres.`

  // Valor igual ao salvo não é revalidado: dado antigo fora do padrão não trava a edição de outros campos.
  if (base) {
    if (digitos(c.cnpj) === base.cnpj) delete erros.cnpj
    if (digitos(c.contato) === base.contato) delete erros.contato
    if (digitos(c.cep) === base.cep) delete erros.cep
  }
  return erros
}

/**
 * Estado, validação e conversão do formulário de fornecedor.
 * Usado pela página de cadastro e pelo modal de edição (`inicial` preenche e serve de base para o PATCH só com o que mudou).
 */
export function useFormularioFornecedor(inicial?: Fornecedor) {
  const inicialCampos = inicial ? camposDoFornecedor(inicial) : null
  const campos = reactive<CamposFornecedor>(
    inicialCampos
      ? { ...inicialCampos }
      : Object.fromEntries(CHAVES.map((chave) => [chave, ''])) as unknown as CamposFornecedor,
  )
  const erros = reactive<ErrosFornecedor>({})
  const erroGeral = shallowRef<string | null>(null)

  const base: Normalizado | null = inicialCampos ? normalizar(inicialCampos) : null

  const opcoes = computed(() => ({
    cargoResponsavel: montarOpcoes(CARGOS_RESPONSAVEL, inicial?.cargoResponsavel ?? ''),
    estado: montarOpcoes(UFS, inicial?.estado),
  }))

  const cidades = useCidadesDoEstado(toRef(campos, 'estado'), toRef(campos, 'cidade'))

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

  function validar(): boolean {
    erroGeral.value = null
    const resultado = validarCampos(campos, base)
    for (const chave of CHAVES) erros[chave] = resultado[chave]
    return Object.keys(resultado).length === 0
  }

  /** Corpo do POST: complemento vazio é omitido. */
  function paraPayload(): FornecedorPayload {
    const { complemento, ...resto } = normalizar(campos)
    return complemento ? { ...resto, complemento } : resto
  }

  /** Corpo do PATCH: só o que mudou; complemento esvaziado vai como '' (a API grava null). */
  function paraAtualizacao(): FornecedorAtualizacao {
    const atual = normalizar(campos)
    const alterados: Record<string, unknown> = {}
    for (const chave of Object.keys(atual) as (keyof Normalizado)[]) {
      if (base && atual[chave] === base[chave]) continue
      alterados[chave] = atual[chave]
    }
    return alterados as FornecedorAtualizacao
  }

  const alterado = computed(() =>
    base ? Object.keys(paraAtualizacao()).length > 0 : CHAVES.some((chave) => campos[chave].trim() !== ''),
  )

  /** Interpreta o erro da API: CNPJ (inválido/duplicado) e CEP vão para o campo; o resto vira mensagem geral. */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    const texto = mensagemFornecedor(mensagem)
    if (status === 409 || /cnpj/i.test(texto)) erros.cnpj = status === 409 ? 'CNPJ já cadastrado para outro fornecedor.' : texto
    else if (/\bcep\b/i.test(texto)) erros.cep = texto
    else erroGeral.value = texto
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
    opcoes,
    cidades,
    buscandoCep,
    alterado,
    aoMudarEstado,
    validar,
    paraPayload,
    paraAtualizacao,
    tratarErroApi,
    buscarCep,
  }
}

export type FormularioFornecedor = ReturnType<typeof useFormularioFornecedor>
