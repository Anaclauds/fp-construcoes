import { computed, reactive, shallowRef, watch, type Ref } from 'vue'
import { extrairErro } from '../services/api'
import type { OpcaoServico } from '../types/orcamento'
import type { EtapaPayload, ProjetoResumo } from '../types/projeto'
import { hojeIso } from '../utils/datas'
import { formatarMoeda, paraCentavos } from '../utils/formatadores'
import { centavosParaMoeda, escalaParaNumero, LIMITE_VALOR_CENTAVOS, textoParaEscala } from '../utils/orcamentos'
import {
  centavosDoCampoMoeda,
  ehEstoqueInsuficiente,
  mensagemProjeto,
  MENSAGEM_LIMITE_VALOR,
  subtotalDasLinhas,
} from '../utils/projetos'
import { useCobrancaProjeto } from './useCobrancaProjeto'

/** Limite do backend para a descrição da etapa (e para a de cada serviço). */
const LIMITE_DESCRICAO = 1000
const LIMITE_NOME_MATERIAL = 180
const LIMITE_UNIDADE = 50

let proximoUid = 1

export interface LinhaServicoEtapa {
  uid: number
  servicoId: string
  quantidade: string
  /** Valor unitário cobrado (moeda mascarada). Nasce com o valor de referência do serviço e pode ser alterado. */
  valorUnitario: string
  /** Custo interno estimado TOTAL da linha (moeda mascarada). */
  custo: string
  descricao: string
  valorEditado: boolean
  custoEditado: boolean
  /** Serviço cujos valores de referência já foram aplicados (para reaplicar quando trocar). */
  servicoAplicado: string
}

export interface LinhaMaterialCliente {
  uid: number
  nome: string
  quantidade: string
  unidade: string
}

export interface ErrosLinhaServico {
  servicoId?: string
  descricao?: string
  quantidade?: string
  valorUnitario?: string
  custo?: string
}

export interface ErrosLinhaMaterial {
  nome?: string
  quantidade?: string
  unidade?: string
}

function novaLinhaServico(): LinhaServicoEtapa {
  return {
    uid: proximoUid++,
    servicoId: '',
    quantidade: '',
    valorUnitario: '',
    custo: '',
    descricao: '',
    valorEditado: false,
    custoEditado: false,
    servicoAplicado: '',
  }
}

function novaLinhaMaterial(): LinhaMaterialCliente {
  return { uid: proximoUid++, nome: '', quantidade: '', unidade: '' }
}

const linhaMaterialVazia = (linha: LinhaMaterialCliente) =>
  linha.nome.trim() === '' && linha.quantidade.trim() === '' && linha.unidade.trim() === ''

/**
 * Formulário "Registrar Etapa" (Construção Civil, projeto em execução).
 *
 * `valorCobrado` (o "Subtotal" da cobrança da etapa) = soma de quantidade x valor unitário de cada serviço executado.
 * O valor unitário nasce com o valor de referência do serviço e pode ser editado em cada linha; o custo interno
 * estimado (total da linha) nasce com quantidade x valor de referência e também é editável.
 * A soma das medições (etapas anteriores + esta) não pode passar do valor do orçamento: o front bloqueia antes do backend.
 */
export function useFormularioEtapaProjeto(
  projeto: ProjetoResumo,
  servicos: Ref<OpcaoServico[]>,
  /** Soma dos `valorCobrado` das etapas já registradas, em centavos. */
  medidoCentavos: Ref<number>,
) {
  const orcamentoCentavos = paraCentavos(projeto.orcamento.valorTotal)

  const descricao = shallowRef('')
  const linhas = reactive<LinhaServicoEtapa[]>([novaLinhaServico()])
  const materiais = reactive<LinhaMaterialCliente[]>([novaLinhaMaterial()])
  const erroDescricao = shallowRef<string | undefined>(undefined)
  const erroSubtotal = shallowRef<string | undefined>(undefined)
  const errosLinhas = reactive<Record<number, ErrosLinhaServico>>({})
  const errosMateriais = reactive<Record<number, ErrosLinhaMaterial>>({})
  const erroGeral = shallowRef<string | null>(null)
  const erroEstoque = shallowRef(false)
  const desatualizado = shallowRef(false)

  const servicoPorId = computed(() => new Map(servicos.value.map((s) => [String(s.id), s])))

  const saldoCentavos = computed(() => orcamentoCentavos - medidoCentavos.value)

  /** Subtotal da medição (= valorCobrado), em centavos. */
  const subtotal = computed(() => subtotalDasLinhas(linhas))
  const cobranca = useCobrancaProjeto(subtotal, { projetoId: projeto.id, valorCobradoCentavos: subtotal })

  /** Total medido depois desta etapa. */
  const medidoComEstaEtapa = computed(() => medidoCentavos.value + subtotal.value)
  const excedeSaldo = computed(() => subtotal.value > saldoCentavos.value)

  // Reaplica os valores de referência do serviço escolhido e recalcula o custo enquanto o usuário não o editou.
  watch(
    () => linhas.map((linha) => `${linha.servicoId}|${linha.quantidade}`),
    () => {
      for (const linha of linhas) {
        const opcao = servicoPorId.value.get(linha.servicoId)
        if (!opcao) continue
        const referencia = paraCentavos(opcao.valorReferencia)

        if (linha.servicoAplicado !== linha.servicoId) {
          linha.servicoAplicado = linha.servicoId
          linha.valorEditado = false
          linha.custoEditado = false
        }
        if (!linha.valorEditado) linha.valorUnitario = formatarMoeda(referencia / 100)
        if (!linha.custoEditado) {
          const quantidade = textoParaEscala(linha.quantidade, 3)
          linha.custo = quantidade === null ? '' : formatarMoeda(Math.round((quantidade * referencia) / 1000) / 100)
        }
      }
    },
  )

  // Qualquer edição limpa o erro correspondente.
  watch(descricao, () => (erroDescricao.value = undefined))
  watch(
    () => linhas.map((l) => `${l.servicoId}|${l.quantidade}|${l.valorUnitario}|${l.custo}`),
    () => {
      erroSubtotal.value = undefined
      erroGeral.value = null
      erroEstoque.value = false
      for (const linha of linhas) if (errosLinhas[linha.uid]) errosLinhas[linha.uid] = {}
    },
  )
  watch(
    () => materiais.map((m) => `${m.nome}|${m.quantidade}|${m.unidade}`),
    () => {
      for (const linha of materiais) if (errosMateriais[linha.uid]) errosMateriais[linha.uid] = {}
    },
  )

  /** Serviços já escolhidos em outras linhas (a API não aceita o mesmo serviço duas vezes). */
  function servicosEmUso(exceto: LinhaServicoEtapa): Set<string> {
    return new Set(linhas.filter((l) => l !== exceto && l.servicoId !== '').map((l) => l.servicoId))
  }

  function adicionarServico() {
    linhas.push(novaLinhaServico())
  }

  function removerServico(linha: LinhaServicoEtapa) {
    const posicao = linhas.indexOf(linha)
    if (posicao >= 0 && linhas.length > 1) {
      linhas.splice(posicao, 1)
      delete errosLinhas[linha.uid]
    }
  }

  function adicionarMaterial() {
    materiais.push(novaLinhaMaterial())
  }

  function removerMaterial(linha: LinhaMaterialCliente) {
    const posicao = materiais.indexOf(linha)
    if (posicao < 0) return
    if (materiais.length > 1) materiais.splice(posicao, 1)
    else Object.assign(materiais[0]!, novaLinhaMaterial(), { uid: linha.uid })
    delete errosMateriais[linha.uid]
  }

  const alterado = computed(
    () =>
      descricao.value.trim() !== '' ||
      linhas.some((l) => l.servicoId !== '' || l.quantidade !== '' || l.descricao.trim() !== '') ||
      materiais.some((m) => !linhaMaterialVazia(m)) ||
      cobranca.alterado.value,
  )

  function validar(): boolean {
    erroGeral.value = null
    erroEstoque.value = false
    erroSubtotal.value = undefined

    if (descricao.value.trim() === '') erroDescricao.value = 'Descreva a etapa.'
    else if (descricao.value.trim().length > LIMITE_DESCRICAO) {
      erroDescricao.value = `Use no máximo ${LIMITE_DESCRICAO} caracteres.`
    } else erroDescricao.value = undefined

    let valido = erroDescricao.value === undefined
    const usados = new Set<string>()
    for (const linha of linhas) {
      const erros: ErrosLinhaServico = {}
      if (linha.servicoId === '') erros.servicoId = 'Selecione o serviço.'
      else if (usados.has(linha.servicoId)) erros.servicoId = 'Não repita o mesmo serviço.'
      else usados.add(linha.servicoId)

      const quantidade = textoParaEscala(linha.quantidade, 3)
      if (linha.quantidade.trim() === '') erros.quantidade = 'Informe a quantidade.'
      else if (quantidade === null || quantidade < 1) erros.quantidade = 'Use uma quantidade maior que zero (até 3 casas).'

      const unitario = centavosDoCampoMoeda(linha.valorUnitario)
      if (unitario === null) erros.valorUnitario = 'Informe o valor unitário.'
      else if (quantidade !== null && Math.round((quantidade * unitario) / 1000) > LIMITE_VALOR_CENTAVOS) {
        erros.valorUnitario = 'Valor da linha acima do limite de R$ 9.999.999.999,99.'
      }
      const custo = centavosDoCampoMoeda(linha.custo)
      if (custo === null) erros.custo = 'Informe o custo estimado (pode ser R$ 0,00).'
      else if (custo > LIMITE_VALOR_CENTAVOS) erros.custo = MENSAGEM_LIMITE_VALOR

      if (linha.descricao.trim().length > LIMITE_DESCRICAO) erros.descricao = `Use no máximo ${LIMITE_DESCRICAO} caracteres.`

      errosLinhas[linha.uid] = erros
      if (Object.keys(erros).length > 0) valido = false
    }

    if (valido && subtotal.value < 1) {
      erroSubtotal.value = 'O valor da etapa deve ser maior que zero. Informe valores unitários maiores que R$ 0,00.'
      valido = false
    } else if (valido && excedeSaldo.value) {
      erroSubtotal.value = `Esta etapa (${centavosParaMoeda(subtotal.value)}) passa do saldo do orçamento (${centavosParaMoeda(Math.max(0, saldoCentavos.value))}). A soma das medições não pode ser maior que ${centavosParaMoeda(orcamentoCentavos)}.`
      valido = false
    }

    for (const linha of materiais) {
      const erros: ErrosLinhaMaterial = {}
      if (!linhaMaterialVazia(linha)) {
        if (linha.nome.trim() === '') erros.nome = 'Informe o nome do material.'
        else if (linha.nome.trim().length > LIMITE_NOME_MATERIAL) erros.nome = `Use no máximo ${LIMITE_NOME_MATERIAL} caracteres.`
        const quantidade = textoParaEscala(linha.quantidade, 3)
        if (linha.quantidade.trim() === '') erros.quantidade = 'Informe a quantidade.'
        else if (quantidade === null || quantidade < 1) erros.quantidade = 'Use uma quantidade maior que zero (até 3 casas).'
        if (linha.unidade.trim() === '') erros.unidade = 'Informe a unidade.'
        else if (linha.unidade.trim().length > LIMITE_UNIDADE) erros.unidade = `Use no máximo ${LIMITE_UNIDADE} caracteres.`
      }
      errosMateriais[linha.uid] = erros
      if (Object.keys(erros).length > 0) valido = false
    }

    // A cobrança só é validada com as linhas ok (o subtotal alimenta o resumo).
    const cobrancaValida = cobranca.validar()
    return valido && cobrancaValida
  }

  /** Corpo do POST /etapas (assume formulário válido); a descrição de cada serviço vai em `servicos[].descricao`. */
  function paraPayload(): EtapaPayload {
    const materiaisCliente = materiais
      .filter((m) => !linhaMaterialVazia(m))
      .map((m) => ({
        nome: m.nome.trim(),
        quantidade: escalaParaNumero(textoParaEscala(m.quantidade, 3) ?? 0, 3),
        unidadeMedida: m.unidade.trim(),
      }))
    return {
      descricao: descricao.value.trim(),
      dataRegistro: hojeIso(),
      valorCobrado: subtotal.value / 100,
      servicos: linhas.map((l) => ({
        servicoId: Number(l.servicoId),
        quantidade: escalaParaNumero(textoParaEscala(l.quantidade, 3) ?? 0, 3),
        valorUnitario: (centavosDoCampoMoeda(l.valorUnitario) ?? 0) / 100,
        custoInternoEstimado: (centavosDoCampoMoeda(l.custo) ?? 0) / 100,
        ...(l.descricao.trim() !== '' ? { descricao: l.descricao.trim() } : {}),
      })),
      ...(materiaisCliente.length > 0 ? { materiaisCliente } : {}),
      ...cobranca.paraPayload(),
    }
  }

  function tratarErroApi(erro: unknown) {
    const { mensagem, codigo, status } = extrairErro(erro)
    erroGeral.value = mensagemProjeto(mensagem, codigo)
    erroEstoque.value = ehEstoqueInsuficiente(codigo)
    // Projeto que já não está em execução ou foi removido: a lista está desatualizada.
    if (codigo === 'PROJETO_STATUS_INVALIDO' || status === 404) desatualizado.value = true
  }

  return {
    orcamentoCentavos,
    saldoCentavos,
    medidoComEstaEtapa,
    subtotal,
    excedeSaldo,
    descricao,
    linhas,
    materiais,
    erroDescricao,
    erroSubtotal,
    errosLinhas,
    errosMateriais,
    erroGeral,
    erroEstoque,
    desatualizado,
    cobranca,
    alterado,
    servicosEmUso,
    adicionarServico,
    removerServico,
    adicionarMaterial,
    removerMaterial,
    validar,
    paraPayload,
    tratarErroApi,
  }
}
