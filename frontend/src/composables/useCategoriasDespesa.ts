import { computed, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { criarCategoriaDespesa, listarCategoriasDespesas } from '../services/categorias.service'
import type { Categoria } from '../types/categoria'
import { CATEGORIA_COMPRA_MATERIAL, CATEGORIA_EXTRA_PROJETO } from '../types/despesa'
import { rotuloCategoriaPorCodigo } from '../utils/despesas'
import { useAuth } from './useAuth'

// Catálogo no escopo do módulo: tabela, filtros, selo e formulário enxergam a mesma lista, e uma categoria nova
// aparece em todos sem recarregar a aplicação.
const categorias = shallowRef<Categoria[]>([])
const carregando = shallowRef(false)
const erro = shallowRef<string | null>(null)
let ultimaRequisicao = 0

async function carregarCatalogo() {
  const requisicao = ++ultimaRequisicao
  carregando.value = true
  erro.value = null
  try {
    const lista = await listarCategoriasDespesas()
    if (requisicao === ultimaRequisicao) categorias.value = lista
  } catch (e) {
    if (requisicao === ultimaRequisicao) erro.value = extrairErro(e).mensagem
  } finally {
    if (requisicao === ultimaRequisicao) carregando.value = false
  }
}

/** Resultado do cadastro de uma categoria: a criada, ou a mensagem para mostrar ao usuário. */
export type ResultadoNovaCategoria = { categoria: Categoria } | { erro: string; duplicada: boolean }

/** Catálogo de categorias de despesa (DESPESAS visualizar para ler, gerenciar para cadastrar). */
export function useCategoriasDespesa() {
  const { temPermissao } = useAuth()

  const podeCadastrar = computed(() => temPermissao('DESPESAS', 'gerenciar'))

  /** Rótulos por nome; o backend envia o nome normalizado e o rótulo que o usuário digitou. */
  const rotulos = computed(() => new Map(categorias.value.map((c) => [c.nome, c.rotulo])))

  /** Categorias que o usuário escolhe numa despesa diversa (a compra e o extra de projeto têm a sua, fixa). */
  const escolhiveis = computed(() =>
    categorias.value.filter((c) => c.nome !== CATEGORIA_COMPRA_MATERIAL && c.nome !== CATEGORIA_EXTRA_PROJETO),
  )

  function rotuloDe(nome: string | null): string {
    return rotuloCategoriaPorCodigo(nome, rotulos.value)
  }

  function carregar() {
    return carregarCatalogo()
  }

  async function cadastrar(nome: string): Promise<ResultadoNovaCategoria> {
    try {
      const categoria = await criarCategoriaDespesa({ nome })
      await carregarCatalogo()
      return { categoria }
    } catch (e) {
      const { status, mensagem } = extrairErro(e)
      if (status === 409) {
        // Já existe (o backend normaliza o nome): atualiza a lista para a categoria aparecer no seletor.
        await carregarCatalogo()
        return { erro: 'Já existe uma categoria com esse nome. Escolha-a na lista.', duplicada: true }
      }
      return { erro: mensagem, duplicada: false }
    }
  }

  return { categorias, escolhiveis, carregando, erro, podeCadastrar, rotuloDe, carregar, cadastrar }
}
