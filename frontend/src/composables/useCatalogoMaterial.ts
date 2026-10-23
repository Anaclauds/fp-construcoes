import { computed, onMounted, shallowRef } from 'vue'
import { listarOpcoesCategoriasMaterial, listarOpcoesUnidadesMaterial, criarCategoriaMaterial } from '../services/categorias.service'
import type { OpcaoSelecao } from '../types/categoria'
import { UNIDADES_MATERIAL } from '../utils/materiais'
import { useAuth } from './useAuth'

/**
 * Catálogo de categorias e unidades de material (`GET /materiais/opcoes/categorias` e `/unidades`).
 * Se a lista de unidades não carregar, usa a lista de reserva; a de categorias fica vazia e avisa (`indisponivel`).
 */
export function useCatalogoMaterial(incluirUnidades = true) {
  const { temPermissao } = useAuth()

  const categorias = shallowRef<OpcaoSelecao[]>([])
  const unidades = shallowRef<OpcaoSelecao[]>(UNIDADES_MATERIAL.map((valor) => ({ valor, rotulo: valor })))
  const carregando = shallowRef(false)
  const indisponivel = shallowRef(false)

  /** Cadastrar categoria de material exige gerenciar MATERIAIS ou ESTOQUE (mesma regra do `POST /categorias/materiais`). */
  const podeCadastrarCategoria = computed(() => temPermissao('MATERIAIS', 'gerenciar') || temPermissao('ESTOQUE', 'gerenciar'))

  async function carregarCategorias() {
    try {
      categorias.value = await listarOpcoesCategoriasMaterial()
      indisponivel.value = false
    } catch {
      indisponivel.value = true
    }
  }

  async function carregarUnidades() {
    try {
      unidades.value = await listarOpcoesUnidadesMaterial()
    } catch {
      // Mantém a lista de reserva.
    }
  }

  async function carregar() {
    carregando.value = true
    await Promise.all(incluirUnidades ? [carregarCategorias(), carregarUnidades()] : [carregarCategorias()])
    carregando.value = false
  }

  /** Cadastra, recarrega as opções e devolve o valor a selecionar (o `nome` devolvido pelo servidor). Erros sobem para quem chamou. */
  async function cadastrarCategoria(nome: string): Promise<string> {
    const criada = await criarCategoriaMaterial({ nome })
    await carregarCategorias()
    return criada.nome
  }

  onMounted(() => void carregar())

  return { categorias, unidades, carregando, indisponivel, podeCadastrarCategoria, cadastrarCategoria, recarregar: carregar }
}

export type CatalogoMaterial = ReturnType<typeof useCatalogoMaterial>
