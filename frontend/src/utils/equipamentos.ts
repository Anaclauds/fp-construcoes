import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { mascararMoeda, normalizarTexto } from './formatadores'
import type { TipoEquipamento } from '../types/equipamento'

export const LIMITE_NOME_EQUIPAMENTO = 150
export const LIMITE_MARCA_EQUIPAMENTO = 80
export const LIMITE_MODELO_EQUIPAMENTO = 80
export const LIMITE_OBSERVACOES_EQUIPAMENTO = 1000
/** DECIMAL(12,2): maior valor aceito pela API. */
export const VALOR_MAXIMO_EQUIPAMENTO = 9_999_999_999.99
/** Ano mínimo aceito no calendário de aquisição. */
export const ANO_MINIMO_AQUISICAO = 1950

/** Tipos aceitos pela API (lista fixa do DTO `TIPOS_EQUIPAMENTO`). */
export const ROTULO_TIPO_EQUIPAMENTO: Record<TipoEquipamento, string> = {
  ELETRICO: 'Elétrico',
  MANUAL: 'Manual',
  HIDRAULICO: 'Hidráulico',
  PNEUMATICO: 'Pneumático',
  ESTRUTURA: 'Estrutura',
  VEICULO: 'Veículo',
  OUTRO: 'Outro',
}

export const TIPOS_EQUIPAMENTO = Object.keys(ROTULO_TIPO_EQUIPAMENTO) as TipoEquipamento[]

export const OPCOES_TIPO_EQUIPAMENTO: OpcaoCampo[] = TIPOS_EQUIPAMENTO.map((valor) => ({
  valor,
  rotulo: ROTULO_TIPO_EQUIPAMENTO[valor],
}))

/** Tipo salvo -> texto da tela; valor fora da lista aparece como está. */
export function rotuloTipoEquipamento(tipo: string): string {
  return ROTULO_TIPO_EQUIPAMENTO[tipo as TipoEquipamento] ?? tipo
}

/** Opções do select + tipo legado (se a API devolver algo fora da lista, não se perde na edição). */
export function opcoesTipoEquipamento(atual?: string): OpcaoCampo[] {
  if (!atual || atual in ROTULO_TIPO_EQUIPAMENTO) return OPCOES_TIPO_EQUIPAMENTO
  return [...OPCOES_TIPO_EQUIPAMENTO, { valor: atual, rotulo: atual }]
}

export const mascararValorEquipamento = (valor: string) => mascararMoeda(valor, 12)

const MENSAGENS: [RegExp, string][] = [
  [/equipamento nao encontrado/, 'Equipamento não encontrado. Atualize a lista.'],
  [/fornecedor ativo nao encontrado/, 'O fornecedor escolhido não está mais ativo. Escolha outro ou deixe em branco.'],
  [/data de aquisicao nao pode estar no futuro/, 'A data de aquisição não pode ser futura.'],
]

export function mensagemEquipamento(mensagem: string): string {
  const k = normalizarTexto(mensagem)
  return MENSAGENS.find(([padrao]) => padrao.test(k))?.[1] ?? mensagem
}
