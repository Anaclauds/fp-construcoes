import { shallowRef } from 'vue'
import { listarEquipamentos } from '../services/equipamentos.service'
import type { Equipamento, FiltrosEquipamentos, TipoEquipamento } from '../types/equipamento'
import { semAcento } from '../utils/formatadores'
import { TIPOS_EQUIPAMENTO } from '../utils/equipamentos'
import { useListaPaginadaEstoque } from './useListaPaginadaEstoque'

export type FiltroTipoEquipamento = 'TODOS' | TipoEquipamento

/** Lista de equipamentos: busca, tipo, status e paginação do servidor. */
export function useListaEquipamentos() {
  const tipo = shallowRef<FiltroTipoEquipamento>('TODOS')

  const lista = useListaPaginadaEstoque<Equipamento, FiltrosEquipamentos>({
    listar: listarEquipamentos,
    filtrosExtras: () => (tipo.value === 'TODOS' ? {} : { tipo: tipo.value }),
    fontesExtras: [tipo],
    // O tipo é guardado sem acento ("ELETRICO"): "Elétrico" digitado na busca precisa encontrá-lo (a colação ignora acentos).
    transformarBusca: semAcento,
    url: {
      rota: 'equipamentos',
      extras: [
        {
          param: 'tipo',
          ler: () => tipo.value,
          definir: (valor) => (tipo.value = valor as FiltroTipoEquipamento),
          padrao: 'TODOS',
          valido: (valor) => (TIPOS_EQUIPAMENTO as string[]).includes(valor),
        },
      ],
    },
  })

  const { itens, ...resto } = lista
  return { ...resto, equipamentos: itens, tipo }
}
