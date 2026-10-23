import { shallowRef } from 'vue'
import { listarMateriais } from '../services/materiais.service'
import type { FiltrosMateriais, Material } from '../types/material'
import { useListaPaginadaCadastro } from './useListaPaginadaCadastro'

/** 'TODAS' = sem filtro; senão, o nome da categoria (a API compara por igualdade, sem acento nem caixa). */
export type FiltroCategoriaMaterial = string

/** Lista de materiais: busca, categoria, status e paginação do servidor. */
export function useListaMateriais() {
  const categoria = shallowRef<FiltroCategoriaMaterial>('TODAS')

  const lista = useListaPaginadaCadastro<Material, FiltrosMateriais>({
    listar: listarMateriais,
    filtrosExtras: () => (categoria.value === 'TODAS' ? {} : { categoria: categoria.value }),
    fontesExtras: [categoria],
    url: {
      rota: 'materiais',
      extras: [{ param: 'categoria', ler: () => categoria.value, definir: (valor) => (categoria.value = valor), padrao: 'TODAS' }],
    },
  })

  const { itens, ...resto } = lista
  return { ...resto, materiais: itens, categoria }
}
