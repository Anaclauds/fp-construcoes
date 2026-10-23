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

/**
 * Corpo do PATCH: só o que mudou. Nome, tipo e marca nunca vão nulos; os opcionais aceitam `null` para limpar
 * (modelo, observações, data e valor de aquisição, fornecedor).
 */
export interface EquipamentoAtualizacao {
  nome?: string
  tipo?: TipoEquipamento
  marca?: string
  modelo?: string | null
  observacoes?: string | null
  dataAquisicao?: string | null
  valorAquisicao?: number | null
  fornecedorId?: number | null
}

export interface FiltrosEquipamentos {
  busca?: string
  tipo?: TipoEquipamento
  status?: StatusCadastro | 'TODOS'
  page?: number
  limit?: number
}
