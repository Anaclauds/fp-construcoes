import { listarFornecedores } from '../services/fornecedores.service'
import type { FiltrosFornecedores, Fornecedor } from '../types/fornecedor'
import { useListaPaginadaCadastro } from './useListaPaginadaCadastro'

/** Lista de fornecedores: busca, status e paginação do servidor. */
export function useListaFornecedores() {
  const lista = useListaPaginadaCadastro<Fornecedor, FiltrosFornecedores>({
    listar: listarFornecedores,
    filtrosExtras: () => ({}),
    fontesExtras: [],
    url: { rota: 'fornecedores', extras: [] },
  })

  const { itens, ...resto } = lista
  return { ...resto, fornecedores: itens }
}
