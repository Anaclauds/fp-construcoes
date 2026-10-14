import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { CategoriaDespesa, Despesa, TipoDespesa } from '../types/despesa'
import { formatarQuantidade } from './estoque'
import { semAcento } from './formatadores'
import { rotuloUnidade } from './materiais'

/** Rótulos do Figma (pílulas do filtro); Mão de Obra e Aluguel existem só na API. */
export const ROTULO_CATEGORIA_DESPESA: Record<CategoriaDespesa, string> = {
  COMPRA_MATERIAL: 'Compra de Material',
  COMBUSTIVEL: 'Combustível',
  FERRAMENTA: 'Ferramenta',
  MANUTENCAO: 'Manutenção',
  ALIMENTACAO: 'Alimentação',
  MAO_DE_OBRA: 'Mão de Obra',
  ALUGUEL: 'Aluguel',
  OUTROS: 'Outros',
}

export const ROTULO_TIPO_DESPESA: Record<TipoDespesa, string> = {
  COMPRA_MATERIAL: 'Compra de Material',
  DIVERSA: 'Despesa Diversa',
}

/** Categorias de uma despesa diversa: a compra de material tem categoria própria e fixa. */
export const CATEGORIAS_DIVERSA: CategoriaDespesa[] = [
  'COMBUSTIVEL',
  'FERRAMENTA',
  'MANUTENCAO',
  'ALIMENTACAO',
  'MAO_DE_OBRA',
  'ALUGUEL',
  'OUTROS',
]

export const OPCOES_CATEGORIA_DIVERSA: OpcaoCampo[] = CATEGORIAS_DIVERSA.map((valor) => ({
  valor,
  rotulo: ROTULO_CATEGORIA_DESPESA[valor],
}))

/** Despesa sem categoria (ex.: gerada por extra de projeto). */
export const ROTULO_SEM_CATEGORIA = 'Sem categoria'

export function rotuloCategoriaDespesa(categoria: CategoriaDespesa | null): string {
  return categoria ? ROTULO_CATEGORIA_DESPESA[categoria] : ROTULO_SEM_CATEGORIA
}

/** Limites do cadastro. A descrição não tem limite na API (coluna TEXT): o do front evita textos absurdos. */
export const LIMITE_DESCRICAO_DESPESA = 500
/** DECIMAL(12,2). */
export const VALOR_MAXIMO_DESPESA = 9_999_999_999.99
/** DECIMAL(12,3). */
export const QUANTIDADE_MAXIMA_COMPRA = 999_999_999.999
export const LIMITE_UNIDADE_COMPRA = 50
/** Ano mínimo aceito na data da despesa (cada data cria o caixa do mês, então datas absurdas são barradas). */
export const ANO_MINIMO_DESPESA = 2000

/** Primeira linha de um texto (extras de projeto trazem a lista de serviços nas linhas seguintes). */
export function primeiraLinha(texto: string): string {
  return texto.split(/\r?\n/, 1)[0]?.trim() ?? ''
}

const PADRAO_EXTRA_PROJETO = /^servicos extras contratados para o projeto (\d+)/i

/**
 * Projeto de origem quando a despesa foi gerada por um extra. O backend atualizado sempre informa `extraProjeto`
 * (`null` quando a despesa não vem de extra: a descrição digitada pelo usuário não vale como pista). Só o backend
 * antigo, que não manda o campo, é reconhecido pelo texto padrão que ele grava na descrição.
 */
export function projetoDoExtra(despesa: Pick<Despesa, 'descricao' | 'tipo' | 'extraProjeto'>): number | null {
  if (despesa.extraProjeto !== undefined) return despesa.extraProjeto?.projetoId ?? null
  if (despesa.tipo !== 'DIVERSA') return null
  const achado = PADRAO_EXTRA_PROJETO.exec(semAcento(despesa.descricao.trim()))
  return achado?.[1] ? Number(achado[1]) : null
}

/** Resumo de uma linha para a tabela: "Tubo 20x20 · 50 m" ou "3 materiais". */
export function resumoMateriais(despesa: Despesa): string {
  const itens = despesa.materiais
  if (itens.length === 0) return ''
  if (itens.length === 1) {
    const item = itens[0]!
    return `${item.material.nome} · ${formatarQuantidade(item.quantidade) || item.quantidade} ${rotuloUnidade(item.unidadeMedida)}`.trim()
  }
  return `${itens.length} materiais`
}

/** Nome do fornecedor para exibição (fantasia primeiro). */
export function nomeFornecedor(fornecedor: { nomeFantasia: string; razaoSocial: string } | null): string {
  if (!fornecedor) return ''
  return fornecedor.nomeFantasia.trim() || fornecedor.razaoSocial
}

/**
 * Total de um item da compra em centavos: quantidade (3 casas) x valor unitário (2 casas), arredondado
 * a 2 casas para cima no meio, como a API. Em BigInt porque o produto passa de 2^53.
 */
export function totalItemCompraCentavos(milesimos: number, centavos: number): number {
  const produto = BigInt(milesimos) * BigInt(centavos)
  return Number((produto + 500n) / 1000n)
}

/** Traduções das mensagens conhecidas da API (a comparação ignora acentos). */
const TRADUCOES: [RegExp, string][] = [
  [/usuario sem permissao/i, 'Você não tem permissão para esta operação.'],
  [/despesa nao encontrada/i, 'Despesa não encontrada. Atualize a lista.'],
  [
    /fornecedor ativo nao encontrado/i,
    'O fornecedor da compra está inativo ou não existe mais. Escolha outro ou reative-o em Fornecedores.',
  ],
  [
    /materiais ativos nao foram encontrados/i,
    'Um ou mais materiais da compra estão inativos ou não existem mais. Troque-os ou reative-os em Materiais.',
  ],
  [/informe ao menos um material/i, 'Adicione ao menos um material à compra.'],
  [/mesmo material nao pode aparecer/i, 'Não repita o mesmo material na compra.'],
  [/despesa de caixa fechado nao pode ser editada/i, 'O caixa do mês desta despesa está fechado: ela não pode mais ser editada.'],
  [/caixa da competencia.*fechado|caixa .* fechado/i, 'O caixa do mês dessa data está fechado. Use uma data de um mês com caixa aberto.'],
  [
    /nao ha saldo disponivel para reduzir/i,
    'O estoque atual não comporta essa redução: parte do material já foi usada ou reservada em projetos.',
  ],
  [/tipo da despesa nao pode ser alterado/i, 'O tipo da despesa não pode ser alterado depois do cadastro.'],
  [/informe o valor da despesa diversa/i, 'Informe o valor da despesa.'],
]

export function mensagemDespesa(mensagem: string): string {
  const normalizada = semAcento(mensagem)
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/** A API recusou editar porque o caixa do mês da despesa já foi fechado (não se resolve no formulário). */
export function mensagemDeCaixaFechado(mensagem: string): boolean {
  return /despesa de caixa fechado/i.test(semAcento(mensagem))
}
