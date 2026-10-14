import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { Cliente, Orcamento, StatusDefinivel, StatusOrcamento, TipoOrcamento } from '../types'
import { formatarCep, formatarMoeda, rotuloLegivel } from './formatadores'

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
  cliente: Pick<Cliente, 'rua' | 'numero' | 'bairro' | 'cidade' | 'estado' | 'cep'>,
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
   Números e cálculo. O backend calcula com Decimal: quantidade arredondada a 2 casas (meio para cima)
   x valor unitário (2 casas); o total do orçamento é a soma desses produtos SEM arredondar item a item,
   menos o desconto, arredondada a 2 casas. Aqui tudo é feito em inteiros para repetir a conta exata.
------------------------------------------------------------------------------------------------ */

/** Maior valor de uma coluna DECIMAL(12,2), em centavos: acima disso a API devolve erro 500. */
export const LIMITE_VALOR_CENTAVOS = 999_999_999_999

/** Digitação de decimal pt-BR: só dígitos e uma vírgula, no máximo `casas` casas e `inteiros` dígitos inteiros. */
export function mascararDecimal(valor: string, casas: number, inteiros = 9): string {
  const limpo = valor.replace(/[^\d.,]/g, '').replace(/\./g, ',')
  const virgula = limpo.indexOf(',')
  const parteInteira = (virgula < 0 ? limpo : limpo.slice(0, virgula)).slice(0, inteiros)
  if (virgula < 0) return parteInteira
  const fracao = limpo.slice(virgula + 1).replace(/,/g, '').slice(0, casas)
  return `${parteInteira === '' ? '0' : parteInteira},${fracao}`
}

/** "2,5" -> 2500 (escala 3). Vazio, inválido ou com casas a mais devolve null. */
export function textoParaEscala(texto: string, casas: number): number | null {
  const t = texto.trim()
  if (!/^\d+(,\d*)?$/.test(t)) return null
  const [inteiro = '', fracao = ''] = t.split(',')
  if (fracao.length > casas) return null
  const numero = Number(inteiro + fracao.padEnd(casas, '0'))
  return Number.isSafeInteger(numero) ? numero : null
}

/** Decimal da API ("12.50", "30.000", 4234) -> texto pt-BR sem zeros à direita ("12,5", "30", "4234"). */
export function decimalApiParaTexto(valor: string | number, minimoCasas = 0): string {
  const texto = String(valor).trim()
  if (!/^\d+(\.\d+)?$/.test(texto)) return ''
  const [inteiro = '0', fracao = ''] = texto.split('.')
  const aparada = fracao.replace(/0+$/, '').padEnd(minimoCasas, '0')
  return aparada === '' ? inteiro : `${inteiro},${aparada}`
}

/** Inteiro em escala -> número JS para o payload (2500 em escala 3 vira 2.5). */
export function escalaParaNumero(escala: number, casas: number): number {
  return escala / 10 ** casas
}

/** Quantidade em milésimos -> centésimos, meio para cima, como o `toDecimalPlaces(2)` do backend. */
function quantidadeEmCentesimos(milesimos: number): number {
  return Math.floor((milesimos + 5) / 10)
}

/** Produto exato em 1/10.000 de real: quantidade a 2 casas x valor unitário em centavos. */
export function produtoItem(milesimos: number, centavos: number): number {
  return quantidadeEmCentesimos(milesimos) * centavos
}

const paraCentavos = (decimilesimos: number) => Math.floor((decimilesimos + 50) / 100)

export interface LinhaParaCalculo {
  quantidade: string
  valorUnitario: string
}

function produtoDaLinha(linha: LinhaParaCalculo): number | null {
  const quantidade = textoParaEscala(linha.quantidade, 3)
  const valor = textoParaEscala(linha.valorUnitario, 2)
  return quantidade === null || valor === null ? null : produtoItem(quantidade, valor)
}

/** Total de um item em centavos (arredondado para exibir na linha); null enquanto faltar quantidade ou valor. */
export function totalDoItem(linha: LinhaParaCalculo): number | null {
  const produto = produtoDaLinha(linha)
  return produto === null ? null : paraCentavos(produto)
}

export interface ResumoCalculado {
  materiais: number
  servicos: number
  total: number
  /** Algum item ou o total passa do limite da coluna do banco. */
  acimaDoLimite: boolean
}

/** Resumo em centavos: linhas incompletas contam como zero (o resumo acompanha a digitação). */
export function calcularResumo(materiais: LinhaParaCalculo[], servicos: LinhaParaCalculo[]): ResumoCalculado {
  const soma = (linhas: LinhaParaCalculo[]) => linhas.reduce((acc, linha) => acc + (produtoDaLinha(linha) ?? 0), 0)
  const dosMateriais = soma(materiais)
  const dosServicos = soma(servicos)
  const itemAcima = [...materiais, ...servicos].some((linha) => (totalDoItem(linha) ?? 0) > LIMITE_VALOR_CENTAVOS)
  const total = paraCentavos(dosMateriais + dosServicos)
  return {
    materiais: paraCentavos(dosMateriais),
    servicos: paraCentavos(dosServicos),
    total,
    acimaDoLimite: itemAcima || total > LIMITE_VALOR_CENTAVOS,
  }
}

/** Centavos -> "R$ 1.234,56". */
export function centavosParaMoeda(centavos: number): string {
  return formatarMoeda(centavos / 100)
}

/** A API responde sem acentos; estas mensagens conhecidas ganham texto correto para o usuário. */
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
  [/funcionario responsavel ativo nao encontrado/i, 'Funcionário responsável ativo não encontrado. Escolha outro.'],
  [/previsao de conclusao nao pode ser anterior/i, 'O término não pode ser anterior ao início.'],
]

export function mensagemOrcamento(mensagem: string): string {
  return TRADUCOES.find(([padrao]) => padrao.test(mensagem))?.[1] ?? mensagem
}
