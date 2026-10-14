import type { StatusCadastro } from './funcionario'

export type TipoEquipamento = 'ELETRICO' | 'MANUAL' | 'HIDRAULICO' | 'PNEUMATICO' | 'ESTRUTURA' | 'VEICULO' | 'OUTRO'

export interface Equipamento {
  id: number
  codigoPatrimonial: string
  nome: string
  tipo: string
  marca: string
  modelo: string | null
  observacoes: string | null
  /** Data só de dia, ISO com hora zerada ("2022-03-10T00:00:00.000Z"). */
  dataAquisicao: string | null
  valorAquisicao: string | null
  fornecedorId: number | null
  status: StatusCadastro
  fornecedor: {
    id: number
    razaoSocial: string
    nomeFantasia: string
    cnpj: string
    status: StatusCadastro
  } | null
}

/** Corpo do POST: opcionais vazios são omitidos; data em AAAA-MM-DD. */
export interface EquipamentoPayload {
  nome: string
  tipo: TipoEquipamento
  marca: string
  modelo?: string
  observacoes?: string
  dataAquisicao?: string
  valorAquisicao?: number
  fornecedorId?: number
}

/** Corpo do PATCH: só o que mudou; fornecedorId null limpa o vínculo. */
export type EquipamentoAtualizacao = Partial<Omit<EquipamentoPayload, 'fornecedorId'>> & {
  fornecedorId?: number | null
}

export interface FiltrosEquipamentos {
  busca?: string
  tipo?: TipoEquipamento
  status?: StatusCadastro | 'TODOS'
  page?: number
  limit?: number
}
