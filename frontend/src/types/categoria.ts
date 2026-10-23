/** Categoria cadastrada pelo usuário (tabela `categoria_cadastro` do backend). */
export type TipoCategoria = 'MATERIAIS' | 'DESPESAS'

export interface Categoria {
  id: number
  tipo: TipoCategoria
  /** Valor enviado nos formulários: o próprio rótulo (materiais) ou o rótulo em CAIXA_ALTA_COM_UNDERLINE (despesas). */
  nome: string
  /** Texto exibido ao usuário. */
  rotulo: string
}

/** Corpo do POST: o backend aceita só `nome` (até 100 caracteres) e o grava também como rótulo. */
export interface CategoriaPayload {
  nome: string
}

/** Opção de lista suspensa devolvida por /materiais/opcoes/categorias e /materiais/opcoes/unidades. */
export interface OpcaoSelecao {
  valor: string
  rotulo: string
}
