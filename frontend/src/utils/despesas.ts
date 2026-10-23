import type { CategoriaDespesa, Despesa } from '../types/despesa'
import { CATEGORIA_COMPRA_MATERIAL, CATEGORIA_EXTRA_PROJETO, CATEGORIA_SEM_CATEGORIA } from '../types/despesa'
import { formatarQuantidade } from './estoque'
import { semAcento } from './formatadores'
import { rotuloUnidade } from './materiais'

/** Despesa sem categoria (legado). */
export const ROTULO_SEM_CATEGORIA = 'Sem categoria'

/** Rótulo das categorias reservadas do sistema, usado enquanto o catálogo não chegou ou se ele não as trouxer. */
const ROTULO_RESERVADAS: Record<string, string> = {
  [CATEGORIA_COMPRA_MATERIAL]: 'Compra de material',
  [CATEGORIA_EXTRA_PROJETO]: 'Extra de projeto',
  [CATEGORIA_SEM_CATEGORIA]: ROTULO_SEM_CATEGORIA,
}

/**
 * Texto da categoria: o rótulo do catálogo; sem ele, o das reservadas; por fim o nome legível
 * ("NOVA_CATEGORIA" -> "Nova categoria").
 */
export function rotuloCategoriaPorCodigo(categoria: CategoriaDespesa | null, rotulos: ReadonlyMap<string, string>): string {
  if (!categoria) return ROTULO_SEM_CATEGORIA
  const conhecido = rotulos.get(categoria) ?? ROTULO_RESERVADAS[categoria]
  if (conhecido) return conhecido
  const texto = categoria.toLowerCase().replace(/_/g, ' ').trim()
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Limites do cadastro (iguais aos do DTO da API: descrição até 1000 caracteres). */
export const LIMITE_DESCRICAO_DESPESA = 1000
/** DECIMAL(12,2). */
export const VALOR_MAXIMO_DESPESA = 9_999_999_999.99
/** DECIMAL(12,3). */
export const QUANTIDADE_MAXIMA_COMPRA = 999_999_999.999
export const LIMITE_UNIDADE_COMPRA = 50
/** Ano mínimo aceito na data da despesa (a API aceita de 2000 até hoje, e só em mês com caixa aberto). */
export const ANO_MINIMO_DESPESA = 2000

/** Primeira linha de um texto (extras de projeto trazem a lista de serviços nas linhas seguintes). */
export function primeiraLinha(texto: string): string {
  return texto.split(/\r?\n/, 1)[0]?.trim() ?? ''
}

/** Projeto de origem quando a despesa foi gerada por um extra (a API informa `extraProjeto`; `null` nas demais). */
export function projetoDoExtra(despesa: Pick<Despesa, 'extraProjeto'>): number | null {
  return despesa.extraProjeto?.projetoId ?? null
}

/** A despesa foi estornada: continua no histórico, mas sem ações. */
export function despesaEstornada(despesa: Pick<Despesa, 'canceladoEm'>): boolean {
  return despesa.canceladoEm !== null
}

/** O caixa do mês da despesa já foi fechado (não aceita edição nem estorno). */
export function caixaDaDespesaFechado(despesa: Pick<Despesa, 'movimentacaoCaixa'>): boolean {
  return despesa.movimentacaoCaixa?.caixa?.status === 'FECHADO'
}

/**
 * Pode abrir o formulário de edição. Despesa de extra tem `editavel` falso, mas a descrição continua editável
 * (valor, data e demais campos ficam travados no formulário); estornada e de caixa fechado não editam nada.
 */
export function podeEditarDespesa(despesa: Despesa): boolean {
  if (despesa.editavel) return true
  return projetoDoExtra(despesa) !== null && !despesaEstornada(despesa) && !caixaDaDespesaFechado(despesa)
}

/**
 * Pode ser estornada nesta tela. A despesa de extra é estornada ao cancelar o extra no projeto, e o estorno
 * precisa do caixa original aberto.
 */
export function podeEstornarDespesa(despesa: Despesa): boolean {
  return !despesaEstornada(despesa) && projetoDoExtra(despesa) === null && !caixaDaDespesaFechado(despesa)
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
    'O fornecedor está inativo ou não existe mais. Escolha outro ou reative-o em Fornecedores.',
  ],
  [
    /materiais ativos nao foram encontrados/i,
    'Um ou mais materiais da compra estão inativos ou não existem mais. Troque-os ou reative-os em Materiais.',
  ],
  [/informe ao menos um material/i, 'Adicione ao menos um material à compra.'],
  [/informe o fornecedor da compra/i, 'Selecione o fornecedor da compra.'],
  [/mesmo material nao pode aparecer/i, 'Não repita o mesmo material na compra.'],
  [
    /unidade de medida cadastrada para o material/i,
    'A compra deve usar a unidade cadastrada do material. Escolha o material de novo para atualizá-la.',
  ],
  [/selecione uma categoria cadastrada/i, 'Selecione uma categoria da lista ou cadastre uma nova.'],
  [/despesa diversa nao pode usar a categoria compra_material/i, 'Escolha outra categoria: esta é exclusiva das compras de material.'],
  [/despesa estornada nao pode ser editada|despesa ja estornada/i, 'Esta despesa já foi estornada.'],
  [
    /valor e data desta despesa vem do extra/i,
    'O valor e a data desta despesa vêm do extra do projeto e não podem ser alterados aqui.',
  ],
  [/cancele o extra no projeto/i, 'Esta despesa foi gerada por um extra de projeto: cancele o extra no projeto.'],
  [
    /material ja utilizado ou reservado/i,
    'Há material desta compra já usado ou reservado em projeto: a compra não pode ser estornada.',
  ],
  [/nao ha estoque disponivel para estornar/i, 'Não há estoque disponível para estornar esta compra.'],
  [
    /nao ha caixa aberto para a competencia|abra o caixa da competencia/i,
    'Não há caixa aberto no mês dessa data. Abra o caixa do mês em Caixa antes de registrar.',
  ],
  [/data do lancamento deve ser entre 2000 e hoje/i, 'A data deve ser de 2000 até hoje.'],
  [
    /nao ha saldo disponivel para reduzir/i,
    'O estoque atual não comporta essa redução: parte do material já foi usada ou reservada em projetos.',
  ],
  [/tipo da despesa nao pode ser alterado/i, 'O tipo da despesa não pode ser alterado depois do cadastro.'],
  [/informe o valor da despesa diversa/i, 'Informe o valor da despesa.'],
  [/saldo do material passaria do limite/i, 'A quantidade levaria o estoque de um dos materiais além do limite permitido (999.999.999,999).'],
  [/ja existe um registro com esses dados/i, 'Já existe um registro com esses dados.'],
]

/** Decididas pelo `codigo` legível do backend (estável), sem olhar o texto da mensagem. */
const MENSAGEM_POR_CODIGO_DESPESA: Record<string, string> = {
  CAIXA_FECHADO: 'O caixa do mês dessa data está fechado. Use uma data de um mês com caixa aberto.',
  DESPESA_CAIXA_FECHADO: 'O caixa do mês desta despesa está fechado: ela não pode mais ser editada.',
}

export function mensagemDespesa(mensagem: string, codigo = ''): string {
  const porCodigo = MENSAGEM_POR_CODIGO_DESPESA[codigo]
  if (porCodigo) return porCodigo
  const normalizada = semAcento(mensagem)
  return TRADUCOES.find(([padrao]) => padrao.test(normalizada))?.[1] ?? mensagem
}

/** A API recusou editar porque o caixa do mês da despesa já foi fechado (não se resolve no formulário). */
export function mensagemDeCaixaFechado(codigo: string): boolean {
  return codigo === 'DESPESA_CAIXA_FECHADO'
}

/** Mensagem do estorno: o caixa fechado aqui é o do mês da despesa (`CAIXA_FECHADO`), não o de uma data digitada. */
export function mensagemEstorno(mensagem: string, codigo = ''): string {
  if (codigo === 'CAIXA_FECHADO') return 'O caixa do mês desta despesa está fechado. Reabra o caixa para estornar.'
  return mensagemDespesa(mensagem, codigo)
}
