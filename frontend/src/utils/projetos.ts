import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { FormaPagamento } from '../types/cobranca'
import type { OpcaoServico } from '../types/orcamento'
import type {
  CancelamentoProjeto,
  EtapaRegistrada,
  ModalidadeCobrancaProjeto,
  ProjetoBase,
  StatusProjeto,
} from '../types/projeto'
import { ROTULO_FORMA_PAGAMENTO } from './cobrancas'
import { formatarCep, moedaParaNumero, paraCentavos, semAcento } from './formatadores'
import { decimalApiParaTexto, textoParaEscala } from './orcamentos'

/* ------------------------------------------------------------------------------------------------
   Status
------------------------------------------------------------------------------------------------ */

export const ROTULO_STATUS_PROJETO: Record<StatusProjeto, string> = {
  PLANEJADO: 'Planejado',
  EM_EXECUCAO: 'Em Execução',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

/** Chips do filtro de status (ordem do Figma: Todos, Em Execução, Planejado, Concluído, Cancelado). */
export const STATUS_PROJETO: StatusProjeto[] = ['PLANEJADO', 'EM_EXECUCAO', 'CONCLUIDO', 'CANCELADO']

/** O projeto aceita registrar etapa/extra e mudar de status só quando está em execução. */
export function projetoEmExecucao(status: StatusProjeto): boolean {
  return status === 'EM_EXECUCAO'
}

/** Endereço da obra numa linha: "Rua X, 100, Apto 2 - Bairro - Cidade/UF (CEP 00000-000)". */
export function enderecoDaObra(
  projeto: Pick<
    ProjetoBase,
    'ruaObra' | 'numeroObra' | 'bairroObra' | 'cidadeObra' | 'estadoObra' | 'cepObra' | 'complementoObra'
  >,
): string {
  const logradouro = [projeto.ruaObra, projeto.numeroObra, projeto.complementoObra].filter(Boolean).join(', ')
  const cidade = [projeto.cidadeObra, projeto.estadoObra].filter(Boolean).join('/')
  const texto = [logradouro, projeto.bairroObra, cidade].filter(Boolean).join(' - ')
  return projeto.cepObra && texto ? `${texto} (CEP ${formatarCep(projeto.cepObra)})` : texto
}

/* ------------------------------------------------------------------------------------------------
   Cronograma
------------------------------------------------------------------------------------------------ */

const MS_POR_DIA = 86_400_000

function utc(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  return Date.UTC(ano, mes - 1, dia)
}

/**
 * Duração da obra em dias corridos, contando o dia de início e o de fim (Figma: 01/10 a 05/10 = "5 dias").
 * Início depois do fim devolve null.
 */
export function duracaoEmDias(inicioIso: string, fimIso: string): number | null {
  const dias = Math.round((utc(fimIso) - utc(inicioIso)) / MS_POR_DIA)
  return dias < 0 ? null : dias + 1
}

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`

/** "5 dias", "1 dia". */
export function textoDias(dias: number): string {
  return plural(dias, 'dia', 'dias')
}

/** Equivalência em meses de 30 dias (Figma: 107 dias = "3 meses e 17 dias"); menos de um mês devolve só os dias. */
export function equivalenteEmMeses(dias: number): string {
  const meses = Math.floor(dias / 30)
  const resto = dias % 30
  if (meses === 0) return textoDias(resto)
  if (resto === 0) return plural(meses, 'mês', 'meses')
  return `${plural(meses, 'mês', 'meses')} e ${textoDias(resto)}`
}

/* ------------------------------------------------------------------------------------------------
   Formas de pagamento da cobrança (textos e ordem do Figma, por modalidade)
------------------------------------------------------------------------------------------------ */

const FORMAS_A_VISTA: FormaPagamento[] = [
  'PIX',
  'BOLETO',
  'TRANSFERENCIA',
  'CHEQUE',
  'CARTAO_DEBITO',
  'CARTAO_CREDITO',
  'DINHEIRO',
]

/** Parcelado automático não aceita cartão de débito, nem as formas sem parcelamento. */
const FORMAS_PARCELADO: FormaPagamento[] = ['BOLETO', 'CARTAO_CREDITO', 'TRANSFERENCIA']

export function opcoesFormaPagamento(modalidade: ModalidadeCobrancaProjeto): OpcaoCampo[] {
  const formas = modalidade === 'A_VISTA' ? FORMAS_A_VISTA : FORMAS_PARCELADO
  return formas.map((valor) => ({ valor, rotulo: ROTULO_FORMA_PAGAMENTO[valor] }))
}

const FORMAS_COM_ACRESCIMO: FormaPagamento[] = ['CARTAO_CREDITO', 'CARTAO_DEBITO', 'BOLETO']

/** Acréscimo só vale para cartão de crédito, cartão de débito e boleto (regra do backend). */
export function formaAceitaAcrescimo(forma: string): boolean {
  return FORMAS_COM_ACRESCIMO.includes(forma as FormaPagamento)
}

export function formaValidaNaModalidade(forma: string, modalidade: ModalidadeCobrancaProjeto): boolean {
  return (modalidade === 'A_VISTA' ? FORMAS_A_VISTA : FORMAS_PARCELADO).includes(forma as FormaPagamento)
}

/* ------------------------------------------------------------------------------------------------
   Cálculo da cobrança. Repete o backend (projetos.service buildCobrancaDto + cobrancas.service buildParcelas):
   tudo em centavos; desconto e acréscimo arredondados separadamente sobre a base; parcela = floor(total / n)
   com o resto na última; vencimento i = primeiro vencimento + i meses, limitado ao último dia do mês (ver `adicionarMeses`).
------------------------------------------------------------------------------------------------ */

/** Acima de LIMITE_VALOR_CENTAVOS (DECIMAL(12,2) da API, em utils/orcamentos) o backend responde 500. */
export const MENSAGEM_LIMITE_VALOR = 'Custo total acima do limite de R$ 9.999.999.999,99.'

/** Ano mínimo de datas de obra e vencimento (evita 20/10/1020 vindo de colagem errada). */
export const ANO_MINIMO_DATA_PROJETO = 2000

export const MAXIMO_PARCELAS = 60
export const MINIMO_PARCELAS = 2

/** "5,5" -> 5.5 (0 a 99,99, duas casas). Vazio conta como 0; texto inválido ou acima de 99,99 devolve null. */
export function percentualDeTexto(texto: string): number | null {
  if (texto.trim() === '') return 0
  const centesimos = textoParaEscala(texto, 2)
  if (centesimos === null || centesimos > 9999) return null
  return centesimos / 100
}

/**
 * Soma meses a uma data ISO limitando ao último dia do mês, sempre a partir do dia original:
 * 31/01 -> 28/02 -> 31/03 -> 30/04 (mesmo cálculo do backend).
 */
export function adicionarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number) as [number, number, number]
  const indice = mes - 1 + meses
  const anoAlvo = ano + Math.floor(indice / 12)
  const mesAlvo = ((indice % 12) + 12) % 12
  const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate()
  const texto = (n: number, tamanho: number) => String(n).padStart(tamanho, '0')
  return `${texto(anoAlvo, 4)}-${texto(mesAlvo + 1, 2)}-${texto(Math.min(dia, ultimoDia), 2)}`
}

export interface ParcelaCalculada {
  numero: number
  /** YYYY-MM-DD. */
  vencimento: string
  centavos: number
}

export interface EntradaCobranca {
  /** Valor sobre o qual a cobrança é calculada (valor do orçamento ou da medição), em centavos. */
  baseCentavos: number
  descontoPercentual: number
  acrescimoPercentual: number
  modalidade: ModalidadeCobrancaProjeto
  /** Só vale no parcelado. */
  parcelas: number
  /** YYYY-MM-DD ou vazio. */
  primeiroVencimento: string
}

export interface CobrancaCalculada {
  subtotal: number
  desconto: number
  acrescimo: number
  final: number
  quantidade: number
  parcelas: ParcelaCalculada[]
  /** Valor das parcelas comuns (as da última podem diferir pelo resto). */
  valorParcela: number
  valorUltimaParcela: number
}

export function calcularCobranca(entrada: EntradaCobranca): CobrancaCalculada {
  const { baseCentavos } = entrada
  const desconto = Math.round((baseCentavos * entrada.descontoPercentual) / 100)
  const acrescimo = Math.round((baseCentavos * entrada.acrescimoPercentual) / 100)
  const final = baseCentavos - desconto + acrescimo

  const quantidade = entrada.modalidade === 'A_VISTA' ? 1 : Math.max(1, entrada.parcelas)
  const valorBase = Math.floor(final / quantidade)
  let distribuido = 0
  const parcelas = Array.from({ length: quantidade }, (_, indice): ParcelaCalculada => {
    const ultima = indice === quantidade - 1
    const centavos = ultima ? final - distribuido : valorBase
    distribuido += centavos
    return {
      numero: indice + 1,
      vencimento: entrada.primeiroVencimento ? adicionarMeses(entrada.primeiroVencimento, indice) : '',
      centavos,
    }
  })

  return {
    subtotal: baseCentavos,
    desconto,
    acrescimo,
    final,
    quantidade,
    parcelas,
    valorParcela: valorBase,
    valorUltimaParcela: parcelas[parcelas.length - 1]?.centavos ?? valorBase,
  }
}

/* ------------------------------------------------------------------------------------------------
   Etapas (medições)
------------------------------------------------------------------------------------------------ */

/** Total já medido (soma de `valorCobrado` das etapas não canceladas), em centavos. */
export function totalMedidoEmCentavos(etapas: Pick<EtapaRegistrada, 'valorCobrado' | 'canceladoEm'>[]): number {
  return etapas.reduce((total, etapa) => (etapa.canceladoEm ? total : total + paraCentavos(etapa.valorCobrado)), 0)
}

/** Campo de moeda mascarado ("R$ 1.234,56") -> centavos; vazio devolve null. */
export function centavosDoCampoMoeda(texto: string): number | null {
  const valor = moedaParaNumero(texto)
  return valor === null ? null : paraCentavos(valor)
}

/**
 * Subtotal da medição em centavos: soma de quantidade (3 casas) x valor unitário (2 casas) de cada serviço,
 * arredondada ao centavo no total. Linha incompleta conta como zero.
 */
export function subtotalDasLinhas(linhas: { quantidade: string; valorUnitario: string }[]): number {
  const milesimosDeCentavo = linhas.reduce((total, linha) => {
    const quantidade = textoParaEscala(linha.quantidade, 3)
    const unitario = centavosDoCampoMoeda(linha.valorUnitario)
    return quantidade === null || unitario === null ? total : total + quantidade * unitario
  }, 0)
  return Math.round(milesimosDeCentavo / 1000)
}

/** Serviços do projeto: só os da categoria do tipo do orçamento. */
export function servicosDaCategoria(servicos: OpcaoServico[], tipo: string): OpcaoServico[] {
  return servicos.filter((servico) => servico.categoria === tipo)
}

/** Unidade de medida cadastrada para exibir ao lado da quantidade ("5", "m²"). */
export function quantidadeComUnidade(quantidade: string, unidade: string): string {
  const numero = decimalApiParaTexto(quantidade)
  return unidade ? `${numero} ${unidade}` : numero
}

/* ------------------------------------------------------------------------------------------------
   Mensagens da API (com ou sem acento) -> texto para o usuário
------------------------------------------------------------------------------------------------ */

const TRADUCOES: [RegExp, string][] = [
  [/projeto nao encontrado/i, 'Projeto não encontrado.'],
  [/somente projeto planejado pode ser iniciado/i, 'Este projeto já foi iniciado ou não está mais planejado. A lista foi atualizada.'],
  [/ja possui cobranca inicial/i, 'Este projeto já possui a cobrança inicial.'],
  [/previsao de conclusao nao pode ser anterior/i, 'A previsão de conclusão não pode ser anterior ao início da obra.'],
  [/informe a forma de pagamento/i, 'Selecione a forma de pagamento.'],
  [/cartao de debito esta disponivel somente/i, 'Cartão de débito só está disponível para cobrança à vista.'],
  [/acrescimo permitido somente/i, 'Acréscimo só vale para cartão de crédito, cartão de débito ou boleto.'],
  [/desconto nao pode zerar/i, 'O desconto não pode zerar o valor da cobrança.'],
  [/cobranca a vista deve ter uma parcela/i, 'Cobrança à vista tem uma parcela só.'],
  [/ao menos duas parcelas|ao menos 2 parcelas/i, 'Informe ao menos duas parcelas para a cobrança parcelada.'],
  [/somente projeto em execucao pode ser concluido ou cancelado/i, 'Só é possível concluir ou cancelar um projeto em execução (planejado só pode ser cancelado). A lista foi atualizada.'],
  [/data de conclusao so pode ser informada ao concluir/i, 'A data de conclusão só vale ao concluir o projeto.'],
  [/conclusao deve ser entre o inicio do projeto e hoje/i, 'A data de conclusão deve estar entre o início da obra e hoje.'],
  [/registros de execucao exigem projeto em execucao/i, 'Só é possível registrar etapas e extras (ou cancelá-los) em projetos em execução. A lista foi atualizada.'],
  [/etapas de medicao sao exclusivas/i, 'Etapas de medição existem apenas em projetos de Construção Civil.'],
  [/servico inexistente, inativo ou de outra categoria/i, 'Existe um serviço inativo ou de outra categoria. Remova-o e tente de novo.'],
  [/material inexistente ou inativo/i, 'Existe um material inexistente ou inativo. Remova-o e tente de novo.'],
  [/soma das medicoes nao pode superar/i, 'A soma das medições não pode ser maior que o valor do orçamento.'],
  [/nao repita o mesmo servico/i, 'Não repita o mesmo serviço.'],
  [/nao repita o mesmo material/i, 'Não repita o mesmo material.'],
  [/ao menos um material ou servico extra/i, 'Adicione ao menos um material, serviço ou gasto avulso ao extra.'],
  [/projeto concluido ou cancelado nao pode ser editado/i, 'Só é possível editar projetos planejados ou em execução. A lista foi atualizada.'],
  [/responsavel deve ser um funcionario ativo/i, 'O responsável escolhido está inativo. Escolha outro funcionário.'],
  [/responsavel nao pode ser removido/i, 'O responsável não pode ser removido.'],
  [/informe os campos a alterar/i, 'Nenhuma alteração para salvar.'],
  [/informe uma (descricao|justificativa) ou data valida/i, 'Informe uma descrição ou uma data válida.'],
  [/etapa com recebimento nao pode ser editada/i, 'Esta etapa não pode ser editada: a cobrança dela já tem recebimento registrado.'],
  [/(etapa cancelada nao pode ser editada|extra cancelado nao pode ser editado)/i, 'Registro cancelado não pode ser editado.'],
  [/data do extra com despesa nao pode ser alterada/i, 'A data deste extra não pode ser alterada porque ele já gerou despesa no caixa. Só a justificativa pode mudar.'],
  [/etapa com recebimento nao pode ser cancelada/i, 'Esta etapa não pode ser cancelada: a cobrança dela já tem recebimento registrado.'],
  [/projeto com recebimento nao permite cancelamento simples de extra/i, 'Este projeto já tem recebimento registrado, então o extra não pode ser cancelado por aqui.'],
  [/material do extra ja consumido/i, 'O material deste extra já foi consumido, então o extra não pode ser cancelado.'],
  [/(etapa ja cancelada|extra ja cancelado)/i, 'Este registro já foi cancelado. Os detalhes foram atualizados.'],
  [/reserva foi alterada/i, 'A reserva de estoque mudou durante o cancelamento. Os detalhes foram atualizados: confira e tente de novo.'],
  [/(etapa nao encontrada|extra nao encontrado)/i, 'Registro não encontrado neste projeto. Os detalhes foram atualizados.'],
  [/nao ha caixa aberto|abra o caixa da competencia/i, 'Não há caixa aberto para o mês de hoje. Abra o caixa (em Caixa) antes de registrar um extra com custo.'],
  [/caixa da competencia.*fechado/i, 'O caixa do mês deste registro está fechado e o serviço adicional com custo precisa lançar a saída nele. Remova os serviços com custo ou registre o extra quando houver um caixa aberto.'],
]

/** Sobra do formato "Estoque insuficiente para X. Disponivel: 1.000" (saída de estoque). */
const ESTOQUE_INSUFICIENTE = /estoque insuficiente para (.+?)\. disponivel: ([\d.,-]+)/i

export function mensagemProjeto(mensagem: string): string {
  const normalizada = semAcento(mensagem)
  const estoque = ESTOQUE_INSUFICIENTE.exec(normalizada)
  if (estoque) {
    const disponivel = decimalApiParaTexto(estoque[2]!.replace(',', '.')) || estoque[2]!
    return `Estoque insuficiente para "${estoque[1]}" (disponível: ${disponivel}). Registre a compra do material ou ajuste o estoque e tente novamente.`
  }
  // "Estoque insuficiente de A, B. Registre a compra em Despesas...": já vem legível, só ganha acentos.
  const varios = /^estoque insuficiente de (.+?)\. registre a compra/i.exec(mensagem)
  if (varios) return `Estoque insuficiente de ${varios[1]}. Registre a compra em Despesas ou ajuste o estoque e tente novamente.`
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/** O erro é de falta de saldo no estoque (`codigo` do backend), para exibir o aviso com destaque e o atalho para o Estoque. */
export function ehEstoqueInsuficiente(codigo: string): boolean {
  return codigo === 'ESTOQUE_INSUFICIENTE'
}

/** Resultado do cancelamento do projeto em uma frase para o aviso. Vazio quando não havia cobrança nem reserva. */
export function resumoCancelamento(cancelamento: CancelamentoProjeto | null | undefined): string {
  if (!cancelamento) return ''
  const partes: string[] = []
  const canceladas = cancelamento.cobrancasCanceladas.length
  const mantidas = cancelamento.cobrancasMantidas.length
  if (canceladas > 0) partes.push(`${plural(canceladas, 'cobrança cancelada', 'cobranças canceladas')}`)
  if (mantidas > 0) {
    partes.push(
      `${plural(mantidas, 'cobrança mantida', 'cobranças mantidas')} por já ter${mantidas === 1 ? '' : 'em'} recebimento (acerte em Cobranças)`,
    )
  }
  if (cancelamento.reservasLiberadas > 0) {
    partes.push(`${plural(cancelamento.reservasLiberadas, 'reserva de estoque liberada', 'reservas de estoque liberadas')}`)
  }
  return partes.length > 0 ? `${partes.join('; ')}.` : ''
}
