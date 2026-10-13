import { reactive, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { buscarEnderecoPorCep } from '../services/enderecos.service'
import type { AprovarOrcamentoPayload, Cliente } from '../types'
import { dataBrParaIso, mascararCep } from '../utils/formatadores'
import { mensagemOrcamento } from '../utils/orcamentos'
import { UFS } from '../utils/opcoes-cliente'
import { dataBrValida } from '../utils/validacao'
import { useBuscaCep } from './useBuscaCep'

export interface CamposAprovacao {
  responsavelId: string
  previsaoInicio: string
  previsaoTermino: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento: string
}

export type ErrosAprovacao = Partial<Record<keyof CamposAprovacao, string>>

const CHAVES: (keyof CamposAprovacao)[] = [
  'responsavelId', 'previsaoInicio', 'previsaoTermino', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'complemento',
]

const digitos = (valor: string) => valor.replace(/\D/g, '')

/**
 * Formulário da aprovação do orçamento (vira projeto): responsável, previsões e endereço da obra.
 * O endereço começa vazio e é preenchido com o do cliente (`preencherComCliente`) assim que ele carrega.
 */
export function useFormularioAprovacao() {
  const campos = reactive<CamposAprovacao>({
    responsavelId: '',
    previsaoInicio: '',
    previsaoTermino: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
  })
  const erros = reactive<ErrosAprovacao>({})
  const erroGeral = shallowRef<string | null>(null)
  /** O endereço veio do cadastro do cliente e ainda não foi alterado à mão. */
  const enderecoDoCliente = shallowRef(false)
  /** O backend disse que o orçamento mudou (já aprovado, cancelado ou removido): a lista está desatualizada. */
  const desatualizado = shallowRef(false)

  for (const chave of CHAVES) {
    watch(
      () => campos[chave],
      () => {
        if (erros[chave]) erros[chave] = undefined
      },
    )
  }

  const { buscandoCep, buscarCep } = useBuscaCep({
    campos,
    erros,
    consultar: buscarEnderecoPorCep,
    ufs: UFS,
    mensagemFalha: (e) => (e instanceof Error ? e.message : 'Não foi possível consultar o CEP.'),
  })

  /** Preenche o endereço da obra com o do cliente, sem sobrescrever o que o usuário já digitou. */
  function preencherComCliente(cliente: Cliente) {
    const sugestao: Partial<CamposAprovacao> = {
      cep: cliente.cep ? mascararCep(cliente.cep) : '',
      rua: cliente.rua ?? '',
      numero: cliente.numero ?? '',
      bairro: cliente.bairro ?? '',
      cidade: cliente.cidade,
      estado: cliente.estado,
      complemento: cliente.complemento ?? '',
    }
    let preencheu = false
    for (const [chave, valor] of Object.entries(sugestao) as [keyof CamposAprovacao, string][]) {
      if (valor !== '' && campos[chave] === '') {
        campos[chave] = valor
        preencheu = true
      }
    }
    if (preencheu) enderecoDoCliente.value = true
  }

  function validar(): boolean {
    erroGeral.value = null
    const obrigatorio = (chave: keyof CamposAprovacao, mensagem: string, max?: number) => {
      const valor = campos[chave].trim()
      if (valor === '') erros[chave] = mensagem
      else if (max && valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
      else erros[chave] = undefined
    }

    erros.responsavelId = campos.responsavelId === '' ? 'Selecione o responsável.' : undefined

    if (campos.previsaoInicio === '') erros.previsaoInicio = 'Informe a data.'
    else if (!dataBrValida(campos.previsaoInicio)) erros.previsaoInicio = 'Data inválida. Use DD/MM/AAAA.'
    else erros.previsaoInicio = undefined

    if (campos.previsaoTermino === '') erros.previsaoTermino = 'Informe a data.'
    else if (!dataBrValida(campos.previsaoTermino)) erros.previsaoTermino = 'Data inválida. Use DD/MM/AAAA.'
    else if (!erros.previsaoInicio && dataBrParaIso(campos.previsaoTermino) < dataBrParaIso(campos.previsaoInicio)) {
      erros.previsaoTermino = 'O término não pode ser anterior ao início.'
    } else erros.previsaoTermino = undefined

    if (campos.cep === '') erros.cep = 'Informe o CEP.'
    else if (digitos(campos.cep).length !== 8) erros.cep = 'CEP inválido. Use 8 dígitos.'
    else erros.cep = undefined

    obrigatorio('rua', 'Informe a rua.', 150)
    obrigatorio('numero', 'Informe o número.', 20)
    obrigatorio('bairro', 'Informe o bairro.', 100)
    obrigatorio('cidade', 'Informe a cidade.', 100)
    if (campos.estado === '') erros.estado = 'Selecione o estado.'
    else if (!UFS.includes(campos.estado)) erros.estado = 'Estado inválido.'
    else erros.estado = undefined
    if (campos.complemento.trim().length > 150) erros.complemento = 'Use no máximo 150 caracteres.'
    else erros.complemento = undefined

    return !Object.values(erros).some(Boolean)
  }

  /** Corpo do PATCH /aprovar (assume campos válidos); datas em YYYY-MM-DD. */
  function paraPayload(): AprovarOrcamentoPayload {
    const complemento = campos.complemento.trim()
    return {
      responsavelId: Number(campos.responsavelId),
      previsaoInicio: dataBrParaIso(campos.previsaoInicio),
      previsaoConclusao: dataBrParaIso(campos.previsaoTermino),
      cepObra: digitos(campos.cep),
      cidadeObra: campos.cidade.trim(),
      estadoObra: campos.estado,
      ruaObra: campos.rua.trim(),
      numeroObra: campos.numero.trim(),
      bairroObra: campos.bairro.trim(),
      ...(complemento ? { complementoObra: complemento } : {}),
    }
  }

  /** 409 (já convertido), 404 (não existe ou responsável inativo) e 400 (cancelado, datas, CEP) viram mensagem clara. */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    const texto = mensagemOrcamento(mensagem)
    if (status === 404 && /funcionario/i.test(mensagem)) {
      erros.responsavelId = texto
      return
    }
    if (status === 409 || status === 404) desatualizado.value = true
    erroGeral.value = texto
  }

  return {
    campos,
    erros,
    erroGeral,
    enderecoDoCliente,
    desatualizado,
    buscandoCep,
    buscarCep,
    preencherComCliente,
    validar,
    paraPayload,
    tratarErroApi,
  }
}

export type FormularioAprovacao = ReturnType<typeof useFormularioAprovacao>
