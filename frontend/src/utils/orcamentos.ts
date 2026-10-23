import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { Cliente, Orcamento, StatusDefinivel, StatusOrcamento, TipoOrcamento } from '../types'
import { textoParaEscala } from './decimal'
import { formatarCep, formatarMoeda, rotuloLegivel, semAcento } from './formatadores'

export const ROTULO_TIPO_ORCAMENTO: Record<TipoOrcamento, string> = {
  SERRALHERIA: 'Serralheria',
  CALHAS: 'Calhas',
  CONSTRUCAO_CIVIL: 'Construção Civil',
}

export const OPCOES_TIPO_ORCAMENTO: OpcaoCampo[] = (Object.keys(ROTULO_TIPO_ORCAMENTO) as TipoOrcamento[]).map(
  (valor) => ({ valor, rotulo: ROTULO_TIPO_ORCAMENTO[valor] }),
)

export const ROTULO_STATUS_ORCAMENTO: Record<StatusOrcamento, string> = {
  PENDENTE: 'Pendente',
  EM_ANALISE: 'Em Análise',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  CANCELADO: 'Cancelado',
}

/** Aprovado e cancelado não aceitam edição nem mudança de status (regra do backend). */
export function orcamentoEditavel(status: StatusOrcamento): boolean {
  return status !== 'APROVADO' && status !== 'CANCELADO'
}

/** Só pendente ou em análise vira projeto; reprovado precisa ser reaberto antes (regra do backend). */
export function orcamentoAprovavel(status: StatusOrcamento): boolean {
  return status === 'PENDENTE' || status === 'EM_ANALISE'
}

/** Para onde o usuário pode mover o orçamento pela tela (APROVADO só pela aprovação). */
export function statusDestinos(status: StatusOrcamento): StatusDefinivel[] {
  if (!orcamentoEditavel(status)) return []
  const todos: StatusDefinivel[] = ['PENDENTE', 'EM_ANALISE', 'REPROVADO', 'CANCELADO']
  return todos.filter((destino) => destino !== status)
}

/** "0001" -> "#0001". */
export function formatarNumeroOrcamento(numero: string): string {
  return `#${numero}`
}

/** Unidade como cadastrada ("UN", "M2", "Metro linear"): siglas conhecidas ganham o nome por extenso. */
const UNIDADES: Record<string, string> = {
  UN: 'Unidade',
  UNID: 'Unidade',
  M: 'Metro',
  ML: 'Metro Linear',
  M2: 'Metro Quadrado',
  M3: 'Metro Cúbico',
  KG: 'Quilo',
  SERVICO: 'Serviço',
}

export function rotuloUnidade(unidade: string): string {
  const chave = unidade.trim().toUpperCase()
  return UNIDADES[chave] ?? (rotuloLegivel(unidade) || unidade)
}

/** Endereço do cliente numa linha: "Rua X, 100 - Bairro - Cidade/UF (CEP 00000-000)". */
export function enderecoEmUmaLinha(
  cliente: Pick<Cliente, 'cidade' | 'estado'> & Partial<Pick<Cliente, 'rua' | 'numero' | 'bairro' | 'cep'>>,
): string {
  const logradouro = [cliente.rua, cliente.numero].filter(Boolean).join(', ')
  const cidade = [cliente.cidade, cliente.estado].filter(Boolean).join('/')
  const texto = [logradouro, cliente.bairro, cidade].filter(Boolean).join(' - ')
  return cliente.cep && texto ? `${texto} (CEP ${formatarCep(cliente.cep)})` : texto
}

/** "Orcamento-0001-Cliente-Teste": nome sugerido do PDF (sem acentos nem caracteres inválidos). */
export function nomeArquivoOrcamento(orcamento: Pick<Orcamento, 'numero' | 'cliente'>): string {
  const cliente = orcamento.cliente.nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return `Orcamento-${orcamento.numero}-${cliente || 'Cliente'}`
}

/* ------------------------------------------------------------------------------------------------
   Números e cálculo. O backend calcula com Decimal: cada linha (quantidade a 3 casas x valor unitário a
   2 casas) é arredondada a centavos (meio para cima) ANTES de somar; o total é a soma das linhas já
   arredondadas menos o desconto. Aqui tudo é feito em inteiros (BigInt no produto) para repetir a conta
   exata, sem ponto flutuante. A prévia local só cobre a digitação: o valor definitivo vem de
   POST /orcamentos/simular (ver `useFormularioOrcamento`).
------------------------------------------------------------------------------------------------ */

/** Maior valor de uma coluna DECIMAL(12,2), em centavos: acima disso a API recusa o valor. */
export const LIMITE_VALOR_CENTAVOS = 999_999_999_999

export { filtrarDecimal, mascararDecimal, normalizarDecimal, textoParaEscala } from './decimal'

/** Decimal da API ("12.50", "30.000", 4234) -> texto pt-BR sem zeros à direita ("12,5", "30", "4234"). */
export function decimalApiParaTexto(valor: string | number, minimoCasas = 0): string {
  const texto = String(valor).trim()
  if (!/^\d+(\.\d+)?$/.test(texto)) return ''
  const [inteiro = '0', fracao = ''] = texto.split('.')
  const aparada = fracao.replace(/0+$/, '').padEnd(minimoCasas, '0')
  return aparada === '' ? inteiro : `${inteiro},${aparada}`
}

/** Decimal monetário da API ("0.06", "1234.5", 12) -> centavos; null se não for um valor com até 2 casas. */
export function decimalApiParaCentavos(valor: string | number): number | null {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(valor).trim())
  if (!partes) return null
  const centavos = Number(partes[1] + (partes[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(centavos) ? centavos : null
}

/** Inteiro em escala -> número JS para o payload (2500 em escala 3 vira 2.5). */
export function escalaParaNumero(escala: number, casas: number): number {
  return escala / 10 ** casas
}

/** Teto para linhas absurdas: bem acima do limite do banco e ainda seguro para somar como número. */
const TETO_LINHA_CENTAVOS = 10n ** 14n

/**
 * Total de uma linha em centavos: quantidade em milésimos x valor em centavos dá 1/100.000 de real,
 * arredondado a centavos meio para cima, como o `toDecimalPlaces(2)` do backend.
 */
export function totalDaLinhaEmCentavos(milesimos: number, centavos: number): number {
  const arredondado = (BigInt(milesimos) * BigInt(centavos) + 500n) / 1000n
  return Number(arredondado > TETO_LINHA_CENTAVOS ? TETO_LINHA_CENTAVOS : arredondado)
}

export interface LinhaParaCalculo {
  quantidade: string
  valorUnitario: string
}

/** Total de um item em centavos; null enquanto faltar quantidade ou valor. */
export function totalDoItem(linha: LinhaParaCalculo): number | null {
  const quantidade = textoParaEscala(linha.quantidade, 3)
  const valor = textoParaEscala(linha.valorUnitario, 2)
  return quantidade === null || valor === null ? null : totalDaLinhaEmCentavos(quantidade, valor)
}

export interface ResumoCalculado {
  materiais: number
  servicos: number
  total: number
  /** Algum item ou o total passa do limite da coluna do banco. */
  acimaDoLimite: boolean
}

/** Resumo em centavos: linhas incompletas contam como zero (o resumo acompanha a digitação). */
export function calcularResumo(
  materiais: LinhaParaCalculo[],
  servicos: LinhaParaCalculo[],
  descontoCentavos = 0,
): ResumoCalculado {
  const soma = (linhas: LinhaParaCalculo[]) => linhas.reduce((acc, linha) => acc + (totalDoItem(linha) ?? 0), 0)
  const dosMateriais = soma(materiais)
  const dosServicos = soma(servicos)
  const itemAcima = [...materiais, ...servicos].some((linha) => (totalDoItem(linha) ?? 0) > LIMITE_VALOR_CENTAVOS)
  const total = Math.max(0, dosMateriais + dosServicos - descontoCentavos)
  return {
    materiais: dosMateriais,
    servicos: dosServicos,
    total,
    acimaDoLimite: itemAcima || total > LIMITE_VALOR_CENTAVOS,
  }
}

/** Centavos -> "R$ 1.234,56". */
export function centavosParaMoeda(centavos: number): string {
  return formatarMoeda(centavos / 100)
}

/** Mensagens conhecidas da API (com ou sem acento; a comparação ignora acentos) ganham texto correto. */
const TRADUCOES: [RegExp, string][] = [
  [/cliente ativo nao encontrado/i, 'Cliente ativo não encontrado. Escolha outro cliente.'],
  [/ao menos um material ou servico/i, 'Adicione ao menos um material ou serviço.'],
  [/nao repita o mesmo material/i, 'Não repita o mesmo material no orçamento.'],
  [/nao repita o mesmo servico/i, 'Não repita o mesmo serviço no orçamento.'],
  [/material inexistente ou inativo/i, 'Existe um material inexistente ou inativo. Remova-o e tente de novo.'],
  [/servico inexistente ou inativo/i, 'Existe um serviço inexistente ou inativo. Remova-o e tente de novo.'],
  [/servicos devem pertencer ao mesmo tipo/i, 'Todos os serviços devem ser do mesmo tipo do orçamento.'],
  [/desconto nao pode ser superior/i, 'O desconto não pode ser maior que o subtotal.'],
  [/aprovados ou cancelados nao podem ser alterados/i, 'Orçamentos aprovados ou cancelados não podem ser alterados.'],
  [/use a operacao de aprovacao/i, 'Para aprovar, use a opção Aprovar.'],
  [/orcamento nao encontrado/i, 'Orçamento não encontrado. Atualize a lista.'],
  [/ja foi convertido em projeto/i, 'Este orçamento já foi convertido em projeto.'],
  [/orcamento cancelado nao pode ser aprovado/i, 'Orçamento cancelado não pode ser aprovado.'],
  [/reprovado precisa ser reaberto/i, 'Orçamento reprovado precisa ser reaberto (Pendente ou Em Análise) antes de ser aprovado.'],
  [/cliente do orcamento esta inativo/i, 'O cliente deste orçamento está inativo. Reative o cliente antes de aprovar.'],
  [/funcionario responsavel ativo nao encontrado/i, 'Funcionário responsável ativo não encontrado. Escolha outro.'],
  [/previsao de conclusao nao pode ser anterior/i, 'O término não pode ser anterior ao início.'],
]

export function mensagemOrcamento(mensagem: string): string {
  const normalizada = semAcento(mensagem)
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}
