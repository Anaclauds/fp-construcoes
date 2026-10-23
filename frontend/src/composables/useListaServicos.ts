import { shallowRef } from 'vue'
import { listarServicos } from '../services/servicos.service'
import type { TipoOrcamento } from '../types'
import type { FiltrosServicos, Servico } from '../types/servico'
import { OPCOES_TIPO_ORCAMENTO } from '../utils/orcamentos'
import { useListaPaginadaCadastro } from './useListaPaginadaCadastro'

export type FiltroCategoriaServico = 'TODOS' | TipoOrcamento

/**
 * Lista de serviços: busca (debounce), categoria, status e paginação do servidor (`status=TODOS` incluído).
 * Busca, status, categoria e página ficam na URL (`?busca=&status=&categoria=&pagina=`), como as demais consultas:
 * recarregar a página ou voltar de outra tela reabre a lista como estava.
 */
export function useListaServicos() {
  const categoria = shallowRef<FiltroCategoriaServico>('TODOS')

  const lista = useListaPaginadaCadastro<Servico, FiltrosServicos>({
    listar: listarServicos,
    filtrosExtras: () => (categoria.value === 'TODOS' ? {} : { categoria: categoria.value }),
    fontesExtras: [categoria],
    url: {
      rota: 'servicos',
      extras: [
        {
          param: 'categoria',
          ler: () => categoria.value,
          definir: (valor) => (categoria.value = valor as FiltroCategoriaServico),
          padrao: 'TODOS',
          valido: (valor) => OPCOES_TIPO_ORCAMENTO.some((opcao) => opcao.valor === valor),
        },
      ],
    },
  })

  const { itens, ...resto } = lista
  return { ...resto, servicos: itens, categoria }
}
