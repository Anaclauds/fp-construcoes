import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import type {
  ClienteDoOrcamento,
  MaterialPayload,
  Orcamento,
  OrcamentoAtualizacao,
  OrcamentoPayload,
  ServicoPayload,
  TipoOrcamento,
} from '../types'
import {
  LIMITE_VALOR_CENTAVOS,
  calcularResumo,
  decimalApiParaTexto,
  escalaParaNumero,
  mensagemOrcamento,
  textoParaEscala,
  totalDoItem,
} from '../utils/orcamentos'
import { useOpcoesOrcamento } from './useOpcoesOrcamento'

export type ClienteSelecionado = Pick<ClienteDoOrcamento, 'id' | 'nome' | 'cidade' | 'estado' | 'telefone'>

export interface LinhaMaterial {
  chave: number
  /** Id da opção de material como texto ('' = ainda não escolhido). */
  materialId: string
  /** Texto pt-BR digitado ("2,5"). */
  quantidade: string
  valorUnitario: string
  /** O usuário mexeu no valor: trocar de material não volta ao preço de referência. */
  valorEditado: boolean
}

export interface LinhaServico {
  chave: number
  servicoId: string
  descricao: string
  quantidade: string
  valorUnitario: string
  valorEditado: boolean
}

export interface CamposOrcamento {
  titulo: string
  tipo: TipoOrcamento | ''
  /** Dias, só dígitos. */
  prazo: string
  observacoes: string
}

export interface ErrosLinha {
  item?: string
  quantidade?: string
  valorUnitario?: string
  descricao?: string
}

export type ErrosCampos = Partial<Record<keyof CamposOrcamento | 'cliente' | 'itens', string>>

const LIMITE_TITULO = 180
const LIMITE_OBSERVACOES = 3000
const LIMITE_DESCRICAO = 1000
const QUANTIDADE_MINIMA = 1 // 0,001 em milésimos
const VALOR_MINIMO = 1 // 0,01 em centavos

let proximaChave = 1

const materialVazio = (): LinhaMaterial => ({
  chave: proximaChave++,
  materialId: '',
  quantidade: '',
  valorUnitario: '',
  valorEditado: false,
})

const servicoVazio = (): LinhaServico => ({
  chave: proximaChave++,
  servicoId: '',
  descricao: '',
  quantidade: '',
  valorUnitario: '',
  valorEditado: false,
})

/** Linha totalmente em branco é ignorada (o formulário abre com uma de cada); parcial gera erros. */
const materialPreenchido = (l: LinhaMaterial) => l.materialId !== '' || l.quantidade !== '' || l.valorUnitario !== ''
const servicoPreenchido = (l: LinhaServico) =>
  l.servicoId !== '' || l.quantidade !== '' || l.valorUnitario !== '' || l.descricao.trim() !== ''

/**
 * Estado, validação e conversão do formulário de orçamento (página de cadastro e modal de edição).
 * - `inicial`: orçamento já cadastrado (edição); sem ele é um cadastro novo.
 * Os totais seguem a conta do backend (ver `calcularResumo`), então o resumo ao vivo bate com o salvo.
 */
export function useFormularioOrcamento(inicial?: Orcamento | null) {
  const opcoes = useOpcoesOrcamento()

  const campos = reactive<CamposOrcamento>({
    titulo: inicial?.titulo ?? '',
    tipo: inicial?.tipo ?? '',
    prazo: inicial ? String(inicial.prazoEstimadoDias) : '',
    observacoes: inicial?.observacoes ?? '',
  })
  const cliente = shallowRef<ClienteSelecionado | null>(inicial ? { ...inicial.cliente } : null)

  const materiais = ref<LinhaMaterial[]>(
    inicial
      ? inicial.materiais.map((m) => ({
          chave: proximaChave++,
          materialId: String(m.materialId),
          quantidade: decimalApiParaTexto(m.quantidade),
          valorUnitario: decimalApiParaTexto(m.valorUnitario, 2),
          valorEditado: true,
        }))
      : [materialVazio()],
  )
  const servicos = ref<LinhaServico[]>(
    inicial
      ? inicial.servicos.map((s) => ({
          chave: proximaChave++,
          servicoId: String(s.servicoId),
          descricao: s.descricaoAdicional ?? '',
          quantidade: decimalApiParaTexto(s.quantidade),
          valorUnitario: decimalApiParaTexto(s.valorUnitario, 2),
          valorEditado: true,
        }))
      : [servicoVazio()],
  )

  const erros = reactive<ErrosCampos>({})
  const errosMateriais = reactive<Record<number, ErrosLinha>>({})
  const errosServicos = reactive<Record<number, ErrosLinha>>({})
  const erroGeral = shallowRef<string | null>(null)

  // Itens do orçamento que já não estão na lista de ativos continuam selecionáveis (o dado não se perde).
  const materiaisExtras = (inicial?.materiais ?? []).map((m) => ({
    id: m.material.id,
    codigo: m.material.codigo,
    nome: m.material.nome,
    categoria: '',
    unidadeMedida: m.material.unidadeMedida,
    precoReferencia: m.valorUnitario,
  }))

  const listaMateriais = computed(() => {
    const ativos = opcoes.materiais.value
    const faltantes = materiaisExtras.filter((extra) => !ativos.some((m) => m.id === extra.id))
    return [...ativos, ...faltantes]
  })

  // Serviço do orçamento que já não está na lista de ativos continua selecionável no tipo original.
  const servicosExtras = (inicial?.servicos ?? []).map((s) => ({
    id: s.servico.id,
    nome: s.servico.nome,
    categoria: inicial!.tipo as string,
    unidadeMedida: s.servico.unidadeMedida,
    valorReferencia: s.valorUnitario,
  }))

  const servicosDoTipo = computed(() => {
    const lista = opcoes.servicosDoTipo(campos.tipo)
    if (!inicial || campos.tipo !== inicial.tipo) return lista
    return [...lista, ...servicosExtras.filter((extra) => !lista.some((s) => s.id === extra.id))]
  })

  const resumo = computed(() => calcularResumo(materiais.value, servicos.value))

  /** Cópia do estado "limpo", para saber se algo mudou. */
  function instantaneo(): string {
    return JSON.stringify([
      campos.titulo.trim(),
      campos.tipo,
      cliente.value?.id ?? null,
      campos.prazo,
      campos.observacoes.trim(),
      materiais.value.filter(materialPreenchido).map((l) => [l.materialId, l.quantidade, l.valorUnitario]),
      servicos.value.filter(servicoPreenchido).map((l) => [l.servicoId, l.descricao.trim(), l.quantidade, l.valorUnitario]),
    ])
  }
  const base = instantaneo()
  const alterado = computed(() => instantaneo() !== base)

  // Mexeu no campo: o erro dele some até a próxima validação.
  for (const chave of ['titulo', 'tipo', 'prazo', 'observacoes'] as const) {
    watch(
      () => campos[chave],
      () => {
        erros[chave] = undefined
      },
    )
  }
  watch(cliente, () => {
    erros.cliente = undefined
  })
  watch(
    () => [materiais.value.length, servicos.value.length],
    () => {
      erros.itens = undefined
    },
  )

  /* ------------------------------ ações nas linhas ------------------------------ */

  function adicionarMaterial() {
    materiais.value.push(materialVazio())
  }

  function removerMaterial(chave: number) {
    materiais.value = materiais.value.filter((l) => l.chave !== chave)
    delete errosMateriais[chave]
  }

  function adicionarServico() {
    servicos.value.push(servicoVazio())
  }

  function removerServico(chave: number) {
    servicos.value = servicos.value.filter((l) => l.chave !== chave)
    delete errosServicos[chave]
  }

  /** Escolhe o material da linha e pré-preenche o valor unitário com o preço de referência. */
  function escolherMaterial(linha: LinhaMaterial, id: string) {
    linha.materialId = id
    delete errosMateriais[linha.chave]?.item
    const opcao = listaMateriais.value.find((m) => String(m.id) === id)
    if (opcao && !linha.valorEditado) {
      linha.valorUnitario = decimalApiParaTexto(opcao.precoReferencia, 2)
      delete errosMateriais[linha.chave]?.valorUnitario
    }
  }

  /** Escolhe o serviço da linha: valor de referência e quantidade 1 (se ainda vazia). */
  function escolherServico(linha: LinhaServico, id: string) {
    linha.servicoId = id
    delete errosServicos[linha.chave]?.item
    const opcao = servicosDoTipo.value.find((s) => String(s.id) === id)
    if (!opcao) return
    if (!linha.valorEditado) {
      linha.valorUnitario = decimalApiParaTexto(opcao.valorReferencia, 2)
      delete errosServicos[linha.chave]?.valorUnitario
    }
    if (linha.quantidade === '') {
      linha.quantidade = '1'
      delete errosServicos[linha.chave]?.quantidade
    }
  }

  /** Digitou num campo da linha: some o erro dele; mexer no valor impede o preço de referência de sobrescrevê-lo. */
  function aoDigitarMaterial(linha: LinhaMaterial, campo: keyof ErrosLinha) {
    delete errosMateriais[linha.chave]?.[campo]
    if (campo === 'valorUnitario') linha.valorEditado = true
  }

  function aoDigitarServico(linha: LinhaServico, campo: keyof ErrosLinha) {
    delete errosServicos[linha.chave]?.[campo]
    if (campo === 'valorUnitario') linha.valorEditado = true
  }

  /** Serviços já escolhidos que não pertencem ao tipo `novo` (trocar o tipo os removeria). */
  function servicosIncompativeis(novo: TipoOrcamento): LinhaServico[] {
    return servicos.value.filter((linha) => {
      if (linha.servicoId === '') return false
      const opcao = opcoes.servicosPorId.value.get(linha.servicoId)
      return !opcao || opcao.categoria !== novo
    })
  }

  /** Troca o tipo e remove os serviços de outro tipo (a tela já confirmou com o usuário). */
  function trocarTipo(novo: TipoOrcamento) {
    const incompativeis = new Set(servicosIncompativeis(novo).map((l) => l.chave))
    if (incompativeis.size > 0) {
      servicos.value = servicos.value.filter((l) => !incompativeis.has(l.chave))
      for (const chave of incompativeis) delete errosServicos[chave]
    }
    campos.tipo = novo
  }

  /* ------------------------------ validação ------------------------------ */

  function validarQuantidadeEValor(linha: { quantidade: string; valorUnitario: string }, erro: ErrosLinha) {
    if (linha.quantidade.trim() === '') erro.quantidade = 'Informe a quantidade.'
    else {
      const q = textoParaEscala(linha.quantidade, 3)
      if (q === null) erro.quantidade = 'Use no máximo 3 casas decimais.'
      else if (q < QUANTIDADE_MINIMA) erro.quantidade = 'Mínimo 0,001.'
    }

    if (linha.valorUnitario.trim() === '') erro.valorUnitario = 'Informe o valor.'
    else {
      const v = textoParaEscala(linha.valorUnitario, 2)
      if (v === null) erro.valorUnitario = 'Use no máximo 2 casas decimais.'
      else if (v < VALOR_MINIMO) erro.valorUnitario = 'Mínimo R$ 0,01.'
    }

    if (!erro.quantidade && !erro.valorUnitario && (totalDoItem(linha) ?? 0) > LIMITE_VALOR_CENTAVOS) {
      erro.valorUnitario = 'Valor acima do limite permitido.'
    }
  }

  /** Valida tudo, preenche os erros e devolve true se estiver certo. */
  function validar(): boolean {
    erroGeral.value = null
    for (const chave of Object.keys(errosMateriais)) delete errosMateriais[Number(chave)]
    for (const chave of Object.keys(errosServicos)) delete errosServicos[Number(chave)]

    const titulo = campos.titulo.trim()
    erros.titulo = titulo === '' ? 'Informe o nome do orçamento.' : titulo.length > LIMITE_TITULO ? `Use no máximo ${LIMITE_TITULO} caracteres.` : undefined
    erros.tipo = campos.tipo === '' ? 'Selecione o tipo.' : undefined
    erros.cliente = cliente.value ? undefined : 'Selecione o cliente.'

    if (campos.prazo.trim() === '') erros.prazo = 'Informe o prazo.'
    else if (!/^\d+$/.test(campos.prazo) || Number(campos.prazo) < 1) erros.prazo = 'Informe um número de dias maior que zero.'
    else erros.prazo = undefined

    erros.observacoes =
      campos.observacoes.trim().length > LIMITE_OBSERVACOES ? `Use no máximo ${LIMITE_OBSERVACOES} caracteres.` : undefined

    const usados = new Set<string>()
    const linhasMateriais = materiais.value.filter(materialPreenchido)
    for (const linha of linhasMateriais) {
      const erro: ErrosLinha = {}
      if (linha.materialId === '') erro.item = 'Selecione o material.'
      else if (usados.has(linha.materialId)) erro.item = 'Material já adicionado.'
      else usados.add(linha.materialId)
      validarQuantidadeEValor(linha, erro)
      if (Object.keys(erro).length > 0) errosMateriais[linha.chave] = erro
    }

    const servicosUsados = new Set<string>()
    const linhasServicos = servicos.value.filter(servicoPreenchido)
    for (const linha of linhasServicos) {
      const erro: ErrosLinha = {}
      if (linha.servicoId === '') erro.item = 'Selecione o serviço.'
      else if (servicosUsados.has(linha.servicoId)) erro.item = 'Serviço já adicionado.'
      else servicosUsados.add(linha.servicoId)
      if (linha.descricao.trim().length > LIMITE_DESCRICAO) erro.descricao = `Use no máximo ${LIMITE_DESCRICAO} caracteres.`
      validarQuantidadeEValor(linha, erro)
      if (Object.keys(erro).length > 0) errosServicos[linha.chave] = erro
    }

    erros.itens =
      linhasMateriais.length + linhasServicos.length === 0 ? 'Adicione ao menos um material ou serviço.' : undefined

    if (resumo.value.acimaDoLimite && !erros.itens) erroGeral.value = 'O valor total passa do limite permitido.'

    return (
      !Object.values(erros).some(Boolean) &&
      Object.keys(errosMateriais).length === 0 &&
      Object.keys(errosServicos).length === 0 &&
      erroGeral.value === null
    )
  }

  /* ------------------------------ payload ------------------------------ */

  function itensPayload(): { materiais: MaterialPayload[]; servicos: ServicoPayload[] } {
    return {
      materiais: materiais.value.filter(materialPreenchido).map((l) => ({
        materialId: Number(l.materialId),
        quantidade: escalaParaNumero(textoParaEscala(l.quantidade, 3) ?? 0, 3),
        valorUnitario: escalaParaNumero(textoParaEscala(l.valorUnitario, 2) ?? 0, 2),
      })),
      servicos: servicos.value.filter(servicoPreenchido).map((l) => ({
        servicoId: Number(l.servicoId),
        ...(l.descricao.trim() ? { descricaoAdicional: l.descricao.trim() } : {}),
        quantidade: escalaParaNumero(textoParaEscala(l.quantidade, 3) ?? 0, 3),
        valorUnitario: escalaParaNumero(textoParaEscala(l.valorUnitario, 2) ?? 0, 2),
      })),
    }
  }

  /** Corpo do POST (assume campos válidos). Desconto e modalidade de pagamento ficam nos padrões da API. */
  function paraPayload(): OrcamentoPayload {
    const itens = itensPayload()
    const observacoes = campos.observacoes.trim()
    return {
      titulo: campos.titulo.trim(),
      tipo: campos.tipo as TipoOrcamento,
      clienteId: cliente.value!.id,
      prazoEstimadoDias: Number(campos.prazo),
      ...(observacoes ? { observacoes } : {}),
      ...(itens.materiais.length > 0 ? { materiais: itens.materiais } : {}),
      ...(itens.servicos.length > 0 ? { servicos: itens.servicos } : {}),
    }
  }

  /**
   * Corpo do PATCH: só o que mudou. O PATCH de materiais/serviços substitui a lista inteira, então
   * se qualquer item (ou o tipo) mudou vão as duas listas completas.
   */
  function paraAtualizacao(): OrcamentoAtualizacao {
    const original = inicial!
    const atualizacao: OrcamentoAtualizacao = {}
    if (campos.titulo.trim() !== original.titulo) atualizacao.titulo = campos.titulo.trim()
    if (campos.tipo !== original.tipo) atualizacao.tipo = campos.tipo as TipoOrcamento
    if (cliente.value!.id !== original.clienteId) atualizacao.clienteId = cliente.value!.id
    if (Number(campos.prazo) !== original.prazoEstimadoDias) atualizacao.prazoEstimadoDias = Number(campos.prazo)
    // '' limpa as observações salvas (null seria ignorado pelo backend).
    if (campos.observacoes.trim() !== (original.observacoes ?? '')) atualizacao.observacoes = campos.observacoes.trim()

    const itens = itensPayload()
    const mudouMateriais = JSON.stringify(itens.materiais) !== JSON.stringify(materiaisOriginais())
    const mudouServicos = JSON.stringify(itens.servicos) !== JSON.stringify(servicosOriginais())
    if (mudouMateriais || mudouServicos || atualizacao.tipo) {
      atualizacao.materiais = itens.materiais
      atualizacao.servicos = itens.servicos
    }
    return atualizacao
  }

  function materiaisOriginais(): MaterialPayload[] {
    return (inicial?.materiais ?? []).map((m) => ({
      materialId: m.materialId,
      quantidade: Number(m.quantidade),
      valorUnitario: Number(m.valorUnitario),
    }))
  }

  function servicosOriginais(): ServicoPayload[] {
    return (inicial?.servicos ?? []).map((s) => ({
      servicoId: s.servicoId,
      ...(s.descricaoAdicional?.trim() ? { descricaoAdicional: s.descricaoAdicional.trim() } : {}),
      quantidade: Number(s.quantidade),
      valorUnitario: Number(s.valorUnitario),
    }))
  }

  /** Interpreta o erro da API: cliente vai para o campo; o resto vira mensagem geral (já em português). */
  function tratarErroApi(erro: unknown) {
    const { mensagem, status } = extrairErro(erro)
    const texto = mensagemOrcamento(mensagem)
    if (status === 404 && /cliente/i.test(mensagem)) erros.cliente = texto
    else erroGeral.value = texto
  }

  return {
    campos,
    cliente,
    materiais,
    servicos,
    erros,
    errosMateriais,
    errosServicos,
    erroGeral,
    resumo,
    alterado,
    opcoes,
    listaMateriais,
    servicosDoTipo,
    adicionarMaterial,
    removerMaterial,
    adicionarServico,
    removerServico,
    escolherMaterial,
    escolherServico,
    aoDigitarMaterial,
    aoDigitarServico,
    servicosIncompativeis,
    trocarTipo,
    validar,
    paraPayload,
    paraAtualizacao,
    tratarErroApi,
  }
}

export type FormularioOrcamento = ReturnType<typeof useFormularioOrcamento>
