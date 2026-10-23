import { computed, reactive, shallowRef, toRef, watch } from 'vue'
import { errosPorCampo, extrairErro } from '../services/api'
import { buscarEnderecoPorCep } from '../services/enderecos.service'
import type { EditarProjetoPayload, ProjetoBase } from '../types/projeto'
import { dataBrParaIso, isoParaDataBr, mascararCep, normalizarTexto } from '../utils/formatadores'
import { UFS } from '../utils/opcoes-cliente'
import { ANO_MINIMO_DATA_PROJETO, mensagemProjeto } from '../utils/projetos'
import { dataBrValida } from '../utils/validacao'
import { useBuscaCep } from './useBuscaCep'
import { useCidadesDoEstado } from './useCidadesDoEstado'

export interface CamposEdicaoProjeto {
  responsavelId: string
  previsaoInicio: string
  previsaoConclusao: string
  cep: string
  rua: string
  numero: string
  bairro: string
  cidade: string
  estado: string
  complemento: string
}

export type ErrosEdicaoProjeto = Partial<Record<keyof CamposEdicaoProjeto, string>>

const CHAVES: (keyof CamposEdicaoProjeto)[] = [
  'responsavelId', 'previsaoInicio', 'previsaoConclusao', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'estado', 'complemento',
]

const digitos = (valor: string) => valor.replace(/\D/g, '')

/** Nome do campo no backend -> campo do formulário (para mostrar o erro de validação no lugar certo). */
const CAMPO_DA_API: Record<string, keyof CamposEdicaoProjeto> = {
  responsavelId: 'responsavelId',
  previsaoInicio: 'previsaoInicio',
  previsaoConclusao: 'previsaoConclusao',
  cepObra: 'cep',
  ruaObra: 'rua',
  numeroObra: 'numero',
  bairroObra: 'bairro',
  cidadeObra: 'cidade',
  estadoObra: 'estado',
  complementoObra: 'complemento',
}

type ProjetoEditavel = Pick<
  ProjetoBase,
  | 'responsavelId' | 'previsaoInicio' | 'previsaoConclusao' | 'cepObra' | 'ruaObra' | 'numeroObra'
  | 'bairroObra' | 'cidadeObra' | 'estadoObra' | 'complementoObra'
>

/**
 * Formulário de "Editar projeto": responsável, previsões e endereço da obra, já preenchidos com o projeto.
 * `paraPayload` devolve só o que mudou (o backend recusa corpo vazio); `alterado` é falso até algo mudar.
 * As previsões são opcionais: apagar o campo envia `null`, que limpa a data no servidor.
 */
export function useFormularioEdicaoProjeto(projeto: ProjetoEditavel) {
  const inicial: CamposEdicaoProjeto = {
    responsavelId: String(projeto.responsavelId),
    previsaoInicio: projeto.previsaoInicio ? isoParaDataBr(projeto.previsaoInicio) : '',
    previsaoConclusao: projeto.previsaoConclusao ? isoParaDataBr(projeto.previsaoConclusao) : '',
    cep: mascararCep(projeto.cepObra),
    rua: projeto.ruaObra,
    numero: projeto.numeroObra,
    bairro: projeto.bairroObra,
    cidade: projeto.cidadeObra,
    estado: projeto.estadoObra.toUpperCase(),
    complemento: projeto.complementoObra ?? '',
  }

  const campos = reactive<CamposEdicaoProjeto>({ ...inicial })
  const erros = reactive<ErrosEdicaoProjeto>({})
  const erroGeral = shallowRef<string | null>(null)
  /** O backend disse que o projeto mudou (não está mais planejado/em execução): a lista está desatualizada. */
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

  // "ji-parana" salvo -> "Ji-Paraná" da lista do IBGE: o valor original passa a ser o oficial, então o ajuste
  // automático ao abrir não marca o formulário como alterado.
  const cidades = useCidadesDoEstado(toRef(campos, 'estado'), toRef(campos, 'cidade'), (anterior, oficial) => {
    if (inicial.cidade.trim() === anterior.trim()) inicial.cidade = oficial
  })

  /** O usuário escolheu outro estado: a cidade anterior não vale mais. (A busca de CEP preenche os dois direto.) */
  function aoMudarEstado(uf: string) {
    if (uf === campos.estado) return
    campos.estado = uf
    campos.cidade = ''
  }

  const igual = (chave: keyof CamposEdicaoProjeto) => {
    const atual = campos[chave].trim()
    const antes = inicial[chave].trim()
    if (chave === 'cep') return digitos(atual) === digitos(antes)
    // A lista do IBGE troca "Ji-Parana" por "Ji-Paraná": não conta como alteração.
    if (chave === 'cidade') return normalizarTexto(atual) === normalizarTexto(antes)
    return atual === antes
  }

  /** Só os campos que mudaram, no formato do PATCH (assume campos válidos). */
  function paraPayload(): EditarProjetoPayload {
    const payload: EditarProjetoPayload = {}
    if (!igual('responsavelId')) payload.responsavelId = Number(campos.responsavelId)
    if (!igual('previsaoInicio')) payload.previsaoInicio = campos.previsaoInicio === '' ? null : dataBrParaIso(campos.previsaoInicio)
    if (!igual('previsaoConclusao')) {
      payload.previsaoConclusao = campos.previsaoConclusao === '' ? null : dataBrParaIso(campos.previsaoConclusao)
    }
    if (!igual('cep')) payload.cepObra = digitos(campos.cep)
    if (!igual('cidade')) payload.cidadeObra = campos.cidade.trim()
    if (!igual('estado')) payload.estadoObra = campos.estado
    if (!igual('rua')) payload.ruaObra = campos.rua.trim()
    if (!igual('numero')) payload.numeroObra = campos.numero.trim()
    if (!igual('bairro')) payload.bairroObra = campos.bairro.trim()
    if (!igual('complemento')) payload.complementoObra = campos.complemento.trim()
    return payload
  }

  const alterado = computed(() => Object.keys(paraPayload()).length > 0)

  /**
   * Início de referência da previsão de conclusão (mesma regra do `PATCH /projetos/:id`, PROJETOS_UPDATE_BADREQUEST_04):
   * só a PREVISÃO de início (a digitada), nunca a data real de início da obra. Vazio se não houver previsão de início.
   */
  function inicioDeReferencia(): string {
    if (campos.previsaoInicio !== '' && dataBrValida(campos.previsaoInicio, ANO_MINIMO_DATA_PROJETO)) {
      return dataBrParaIso(campos.previsaoInicio)
    }
    return ''
  }

  function validarData(chave: 'previsaoInicio' | 'previsaoConclusao') {
    const texto = campos[chave]
    // Vazio é válido: a previsão é opcional e, se já existia, é limpa com null.
    if (texto === '') erros[chave] = undefined
    else if (!dataBrValida(texto, ANO_MINIMO_DATA_PROJETO)) erros[chave] = 'Data inválida. Use DD/MM/AAAA.'
    else erros[chave] = undefined
  }

  function validar(): boolean {
    erroGeral.value = null
    const obrigatorio = (chave: keyof CamposEdicaoProjeto, mensagem: string, max: number) => {
      const valor = campos[chave].trim()
      if (valor === '') erros[chave] = mensagem
      else if (valor.length > max) erros[chave] = `Use no máximo ${max} caracteres.`
      else erros[chave] = undefined
    }

    erros.responsavelId = campos.responsavelId === '' ? 'Selecione o responsável.' : undefined

    validarData('previsaoInicio')
    validarData('previsaoConclusao')
    if (!erros.previsaoConclusao && campos.previsaoConclusao !== '') {
      const inicio = inicioDeReferencia()
      if (inicio && dataBrParaIso(campos.previsaoConclusao) < inicio) {
        erros.previsaoConclusao = 'A previsão de conclusão não pode ser anterior à previsão de início.'
      }
    }

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
    erros.complemento = campos.complemento.trim().length > 150 ? 'Use no máximo 150 caracteres.' : undefined

    return !Object.values(erros).some(Boolean)
  }

  /**
   * Erros de validação vão para o campo certo; 409/404 (projeto mudou ou sumiu) pedem recarregar a lista;
   * responsável inativo marca o próprio campo.
   */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status, codigo } = extrairErro(erro)
    const texto = mensagemProjeto(mensagem, codigo)
    if (codigo === 'RESPONSAVEL_INATIVO') {
      erros.responsavelId = texto
      return
    }
    let achouCampo = false
    for (const [campo, mensagemCampo] of Object.entries(errosPorCampo(erro))) {
      const chave = CAMPO_DA_API[campo]
      if (chave) {
        erros[chave] = mensagemCampo
        achouCampo = true
      }
    }
    if (achouCampo) return
    if (status === 409 || status === 404) desatualizado.value = true
    erroGeral.value = texto
  }

  return {
    campos,
    erros,
    erroGeral,
    desatualizado,
    alterado,
    buscandoCep,
    buscarCep,
    cidades,
    aoMudarEstado,
    validar,
    paraPayload,
    tratarErroApi,
  }
}

export type FormularioEdicaoProjeto = ReturnType<typeof useFormularioEdicaoProjeto>
