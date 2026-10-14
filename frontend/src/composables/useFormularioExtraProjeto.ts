import { computed, reactive, shallowRef, watch, type Ref } from 'vue'
import { extrairErro } from '../services/api'
import type { OpcaoMaterial, OpcaoServico } from '../types/orcamento'
import type { ExtraPayload } from '../types/projeto'
import { hojeIso } from '../utils/datas'
import { formatarMoeda, paraCentavos } from '../utils/formatadores'
import { escalaParaNumero, LIMITE_VALOR_CENTAVOS, textoParaEscala } from '../utils/orcamentos'
import {
  centavosDoCampoMoeda,
  ehEstoqueInsuficiente,
  mensagemProjeto,
  MENSAGEM_LIMITE_VALOR,
} from '../utils/projetos'

const LIMITE_DESCRICAO = 3000

let proximoUid = 1

export interface LinhaExtraMaterial {
  uid: number
  materialId: string
  quantidade: string
  /** Custo interno estimado POR UNIDADE (moeda mascarada); nasce com o preço de referência do material. */
  custo: string
  custoEditado: boolean
  materialAplicado: string
}

export interface LinhaExtraServico {
  uid: number
  servicoId: string
  quantidade: string
  /** Custo interno estimado POR UNIDADE (moeda mascarada); nasce com o valor de referência do serviço. */
  custo: string
  descricao: string
  custoEditado: boolean
  servicoAplicado: string
}

export interface ErrosLinhaExtra {
  item?: string
  quantidade?: string
  custo?: string
}

const novaLinhaMaterial = (): LinhaExtraMaterial => ({
  uid: proximoUid++,
  materialId: '',
  quantidade: '',
  custo: '',
  custoEditado: false,
  materialAplicado: '',
})

const novaLinhaServico = (): LinhaExtraServico => ({
  uid: proximoUid++,
  servicoId: '',
  quantidade: '',
  custo: '',
  descricao: '',
  custoEditado: false,
  servicoAplicado: '',
})

/** Linha sem item e sem quantidade: ignorada (o Figma abre cada lista com uma linha em branco). */
const materialVazio = (l: LinhaExtraMaterial) => l.materialId === '' && l.quantidade.trim() === ''
const servicoVazio = (l: LinhaExtraServico) => l.servicoId === '' && l.quantidade.trim() === '' && l.descricao.trim() === ''

/** Custo total da linha em centavos (custo unitário x quantidade); linha incompleta conta como zero. */
function custoTotalDaLinha(quantidade: string, custo: string): number {
  const qtd = textoParaEscala(quantidade, 3)
  const unitario = centavosDoCampoMoeda(custo)
  return qtd === null || unitario === null ? 0 : Math.round((qtd * unitario) / 1000)
}

/**
 * Formulário "Registrar Extra" (qualquer tipo de projeto em execução): justificativa, materiais adicionais
 * (reservam estoque) e serviços adicionais da categoria do projeto (com custo, geram despesa e saída no caixa).
 * O custo informado é unitário (é assim que a API o recebe) e nasce com o valor de referência do cadastro.
 */
export function useFormularioExtraProjeto(materiaisOpcoes: Ref<OpcaoMaterial[]>, servicosOpcoes: Ref<OpcaoServico[]>) {
  const descricao = shallowRef('')
  const materiais = reactive<LinhaExtraMaterial[]>([novaLinhaMaterial()])
  const servicos = reactive<LinhaExtraServico[]>([novaLinhaServico()])
  const erroDescricao = shallowRef<string | undefined>(undefined)
  const erroItens = shallowRef<string | undefined>(undefined)
  const errosMateriais = reactive<Record<number, ErrosLinhaExtra>>({})
  const errosServicos = reactive<Record<number, ErrosLinhaExtra>>({})
  const erroGeral = shallowRef<string | null>(null)
  const erroEstoque = shallowRef(false)
  const desatualizado = shallowRef(false)

  const materialPorId = computed(() => new Map(materiaisOpcoes.value.map((m) => [String(m.id), m])))
  const servicoPorId = computed(() => new Map(servicosOpcoes.value.map((s) => [String(s.id), s])))

  // Aplica o custo de referência do item escolhido enquanto o usuário não editar o campo.
  watch(
    () => materiais.map((l) => l.materialId),
    () => {
      for (const linha of materiais) {
        const opcao = materialPorId.value.get(linha.materialId)
        if (!opcao) continue
        if (linha.materialAplicado !== linha.materialId) {
          linha.materialAplicado = linha.materialId
          linha.custoEditado = false
        }
        if (!linha.custoEditado) linha.custo = formatarMoeda(paraCentavos(opcao.precoReferencia) / 100)
      }
    },
  )
  watch(
    () => servicos.map((l) => l.servicoId),
    () => {
      for (const linha of servicos) {
        const opcao = servicoPorId.value.get(linha.servicoId)
        if (!opcao) continue
        if (linha.servicoAplicado !== linha.servicoId) {
          linha.servicoAplicado = linha.servicoId
          linha.custoEditado = false
        }
        if (!linha.custoEditado) linha.custo = formatarMoeda(paraCentavos(opcao.valorReferencia) / 100)
      }
    },
  )

  watch(descricao, () => (erroDescricao.value = undefined))
  watch(
    () => [...materiais.map((l) => `${l.materialId}|${l.quantidade}|${l.custo}`), ...servicos.map((l) => `${l.servicoId}|${l.quantidade}|${l.custo}`)],
    () => {
      erroItens.value = undefined
      erroGeral.value = null
      erroEstoque.value = false
      for (const linha of materiais) if (errosMateriais[linha.uid]) errosMateriais[linha.uid] = {}
      for (const linha of servicos) if (errosServicos[linha.uid]) errosServicos[linha.uid] = {}
    },
  )

  function materiaisEmUso(exceto: LinhaExtraMaterial): Set<string> {
    return new Set(materiais.filter((l) => l !== exceto && l.materialId !== '').map((l) => l.materialId))
  }

  function servicosEmUso(exceto: LinhaExtraServico): Set<string> {
    return new Set(servicos.filter((l) => l !== exceto && l.servicoId !== '').map((l) => l.servicoId))
  }

  function adicionarMaterial() {
    materiais.push(novaLinhaMaterial())
  }

  function removerMaterial(linha: LinhaExtraMaterial) {
    const posicao = materiais.indexOf(linha)
    if (posicao < 0) return
    if (materiais.length > 1) materiais.splice(posicao, 1)
    else Object.assign(materiais[0]!, novaLinhaMaterial(), { uid: linha.uid })
    delete errosMateriais[linha.uid]
  }

  function adicionarServico() {
    servicos.push(novaLinhaServico())
  }

  function removerServico(linha: LinhaExtraServico) {
    const posicao = servicos.indexOf(linha)
    if (posicao < 0) return
    if (servicos.length > 1) servicos.splice(posicao, 1)
    else Object.assign(servicos[0]!, novaLinhaServico(), { uid: linha.uid })
    delete errosServicos[linha.uid]
  }

  /** Custo estimado dos materiais e dos serviços adicionais, em centavos. */
  const custoMateriais = computed(() =>
    materiais.filter((l) => !materialVazio(l)).reduce((total, l) => total + custoTotalDaLinha(l.quantidade, l.custo), 0),
  )
  const custoServicos = computed(() =>
    servicos.filter((l) => !servicoVazio(l)).reduce((total, l) => total + custoTotalDaLinha(l.quantidade, l.custo), 0),
  )

  const alterado = computed(
    () => descricao.value.trim() !== '' || materiais.some((l) => !materialVazio(l)) || servicos.some((l) => !servicoVazio(l)),
  )

  /** Justificativa enviada + a descrição opcional de cada serviço (a API não tem campo para ela). */
  function descricaoFinal(): string {
    const detalhes = servicos
      .filter((l) => l.descricao.trim() !== '')
      .map((l) => `- ${servicoPorId.value.get(l.servicoId)?.nome ?? 'Serviço'}: ${l.descricao.trim()}`)
    const base = descricao.value.trim()
    return detalhes.length > 0 ? `${base}\n\nDetalhes dos serviços:\n${detalhes.join('\n')}` : base
  }

  function validarLinha(
    id: string,
    quantidade: string,
    custo: string,
    rotuloItem: string,
    usados: Set<string>,
  ): ErrosLinhaExtra {
    const erros: ErrosLinhaExtra = {}
    if (id === '') erros.item = `Selecione o ${rotuloItem}.`
    else if (usados.has(id)) erros.item = `Não repita o mesmo ${rotuloItem}.`
    else usados.add(id)

    const qtd = textoParaEscala(quantidade, 3)
    if (quantidade.trim() === '') erros.quantidade = 'Informe a quantidade.'
    else if (qtd === null || qtd < 1) erros.quantidade = 'Use uma quantidade maior que zero (até 3 casas).'

    if (centavosDoCampoMoeda(custo) === null) erros.custo = 'Informe o custo estimado (pode ser R$ 0,00).'
    // Custo unitário x quantidade acima do DECIMAL(12,2) da API vira erro 500: barra aqui.
    else if (!erros.quantidade && custoTotalDaLinha(quantidade, custo) > LIMITE_VALOR_CENTAVOS) erros.custo = MENSAGEM_LIMITE_VALOR
    return erros
  }

  function validar(): boolean {
    erroGeral.value = null
    erroEstoque.value = false

    if (descricao.value.trim() === '') erroDescricao.value = 'Informe a descrição/justificativa do extra.'
    else if (descricaoFinal().length > LIMITE_DESCRICAO) {
      erroDescricao.value = `A descrição (com os detalhes dos serviços) passa de ${LIMITE_DESCRICAO} caracteres.`
    } else erroDescricao.value = undefined

    let valido = erroDescricao.value === undefined

    const usadosMateriais = new Set<string>()
    for (const linha of materiais) {
      const erros = materialVazio(linha)
        ? {}
        : validarLinha(linha.materialId, linha.quantidade, linha.custo, 'material', usadosMateriais)
      errosMateriais[linha.uid] = erros
      if (Object.keys(erros).length > 0) valido = false
    }

    const usadosServicos = new Set<string>()
    for (const linha of servicos) {
      const erros = servicoVazio(linha)
        ? {}
        : validarLinha(linha.servicoId, linha.quantidade, linha.custo, 'serviço', usadosServicos)
      errosServicos[linha.uid] = erros
      if (Object.keys(erros).length > 0) valido = false
    }

    if (valido && custoMateriais.value + custoServicos.value > LIMITE_VALOR_CENTAVOS) {
      erroItens.value = 'O custo total do extra passa do limite de R$ 9.999.999.999,99. Reduza quantidades ou custos.'
      valido = false
    }

    const temItem = materiais.some((l) => !materialVazio(l)) || servicos.some((l) => !servicoVazio(l))
    if (!temItem) {
      erroItens.value = 'Adicione ao menos um material ou serviço ao extra.'
      valido = false
    }
    return valido
  }

  /** Corpo do POST /extras (assume formulário válido). */
  function paraPayload(): ExtraPayload {
    const materiaisPayload = materiais
      .filter((l) => !materialVazio(l))
      .map((l) => ({
        materialId: Number(l.materialId),
        quantidade: escalaParaNumero(textoParaEscala(l.quantidade, 3) ?? 0, 3),
        custoUnitarioEstimado: (centavosDoCampoMoeda(l.custo) ?? 0) / 100,
      }))
    const servicosPayload = servicos
      .filter((l) => !servicoVazio(l))
      .map((l) => ({
        servicoId: Number(l.servicoId),
        quantidade: escalaParaNumero(textoParaEscala(l.quantidade, 3) ?? 0, 3),
        custoUnitarioEstimado: (centavosDoCampoMoeda(l.custo) ?? 0) / 100,
      }))
    return {
      dataRegistro: hojeIso(),
      descricaoJustificativa: descricaoFinal(),
      ...(materiaisPayload.length > 0 ? { materiais: materiaisPayload } : {}),
      ...(servicosPayload.length > 0 ? { servicos: servicosPayload } : {}),
    }
  }

  function tratarErroApi(erro: unknown) {
    const { mensagem } = extrairErro(erro)
    erroGeral.value = mensagemProjeto(mensagem)
    erroEstoque.value = ehEstoqueInsuficiente(mensagem)
    if (/registros de execucao|projeto nao encontrado/i.test(mensagem)) desatualizado.value = true
  }

  return {
    descricao,
    materiais,
    servicos,
    erroDescricao,
    erroItens,
    errosMateriais,
    errosServicos,
    erroGeral,
    erroEstoque,
    desatualizado,
    custoMateriais,
    custoServicos,
    alterado,
    materiaisEmUso,
    servicosEmUso,
    adicionarMaterial,
    removerMaterial,
    adicionarServico,
    removerServico,
    validar,
    paraPayload,
    tratarErroApi,
    custoTotalDaLinha,
  }
}
