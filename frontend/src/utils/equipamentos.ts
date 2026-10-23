import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { ErroApi } from '../services/api'
import { interpretarPorCodigo, type ErroInterpretado } from './erros-cadastro'
import { mascararMoeda } from './formatadores'
import type { TipoEquipamento } from '../types/equipamento'

export const LIMITE_NOME_EQUIPAMENTO = 150
export const LIMITE_MARCA_EQUIPAMENTO = 80
export const LIMITE_MODELO_EQUIPAMENTO = 80
/** Mesmo limite do DTO de equipamento no backend (`observacoes`, 3000 caracteres). */
export const LIMITE_OBSERVACOES_EQUIPAMENTO = 3000
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

/** Campo do formulário de equipamento citado por um erro de negócio. */
export type CampoErroEquipamento = 'data' | 'fornecedor'

/**
 * Erros de negócio de equipamentos decididos pelo `codigo` (`equipamentos.service.ts`). Os terminados em `_01` são
 * gerados pelo nome do método no backend; não há código legível para eles e precisam acompanhar o backend.
 */
const ERROS_EQUIPAMENTO: Record<string, ErroInterpretado<CampoErroEquipamento>> = {
  EQUIPAMENTOS_FINDONE_NOTFOUND_01: { mensagem: 'Equipamento não encontrado. Atualize a lista.' },
  FORNECEDOR_INATIVO: {
    campo: 'fornecedor',
    mensagem: 'O fornecedor escolhido não está mais ativo. Escolha outro ou deixe em branco.',
  },
  EQUIPAMENTOS_VALIDATEDATAAQUISICAO_BADREQUEST_01: { campo: 'data', mensagem: 'A data de aquisição não pode ser futura.' },
}

export const interpretarErroEquipamento = (erro: ErroApi): ErroInterpretado<CampoErroEquipamento> =>
  interpretarPorCodigo(ERROS_EQUIPAMENTO, erro)

/** Mensagem para o usuário (modais de ativar/desativar, que não têm campos). */
export const mensagemEquipamento = (erro: ErroApi): string => interpretarErroEquipamento(erro).mensagem
