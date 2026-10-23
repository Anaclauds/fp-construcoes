import { computed, onMounted, shallowRef } from 'vue'
import { criarCategoriaMaterial, listarOpcoesCategoriasMaterial, listarOpcoesUnidadesMaterial } from '../services/categorias.service'
import { listarCategoriasEmUso, type StatusCategoriasEmUso } from '../services/materiais.service'
import type { OpcaoSelecao } from '../types/categoria'
import { normalizarTexto } from '../utils/formatadores'
import { UNIDADES_MATERIAL } from '../utils/materiais'
import { useAuth } from './useAuth'

export interface OpcoesCatalogoMaterial {
  /** Carrega também as unidades de medida (formulários). Padrão: sim. */
  unidades?: boolean
  /**
   * Inclui no filtro as categorias gravadas em materiais existentes (legadas, fora do catálogo), lendo só materiais
   * deste status: o Estoque lista apenas `ATIVO`; Materiais lista `TODOS`. Sem valor, só o catálogo.
   */
  emUso?: StatusCategoriasEmUso
}

/**
 * Catálogo de categorias e unidades de material (`GET /materiais/opcoes/categorias` e `/unidades`).
 * As consultas ficam em cache de sessão (ver `categorias.service` e `materiais.service`): abrir modais em sequência
 * não repete chamadas, e cadastrar/editar material ou categoria invalida o cache.
 * Se a lista de unidades não carregar, usa a lista de reserva; a de categorias fica vazia e avisa (`indisponivel`).
 */
export function useCatalogoMaterial({ unidades: incluirUnidades = true, emUso: statusEmUso }: OpcoesCatalogoMaterial = {}) {
  const { temPermissao } = useAuth()

  const categorias = shallowRef<OpcaoSelecao[]>([])
  const emUso = shallowRef<string[]>([])
  /** Falso quando há materiais demais para ler todas as categorias em uso (a busca por texto continua achando tudo). */
  const emUsoCompleto = shallowRef(true)
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

  /** Só alimenta filtros: se falhar, o filtro fica com as categorias do catálogo. */
  async function carregarEmUso() {
    if (!statusEmUso) return
    try {
      const resultado = await listarCategoriasEmUso(statusEmUso)
      emUso.value = resultado.categorias
      emUsoCompleto.value = resultado.completo
    } catch {
      // Mantém só o catálogo.
    }
  }

  /** Catálogo + categorias legadas em uso por materiais existentes. Não usar em formulário de novo material (a API recusa categoria fora do catálogo). */
  const categoriasFiltro = computed<OpcaoSelecao[]>(() => {
    const lista = [...categorias.value]
    const conhecidas = new Set(lista.map((o) => normalizarTexto(o.valor)))
    for (const nome of emUso.value) {
      if (conhecidas.has(normalizarTexto(nome))) continue
      conhecidas.add(normalizarTexto(nome))
      lista.push({ valor: nome, rotulo: nome })
    }
    return lista.sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'))
  })

  async function carregarUnidades() {
    try {
      unidades.value = await listarOpcoesUnidadesMaterial()
    } catch {
      // Mantém a lista de reserva.
    }
  }

  /** Carrega (do cache, quando houver) o que este uso precisa. */
  async function carregar() {
    carregando.value = true
    const tarefas = [carregarCategorias()]
    if (incluirUnidades) tarefas.push(carregarUnidades())
    if (statusEmUso) tarefas.push(carregarEmUso())
    await Promise.all(tarefas)
    carregando.value = false
  }

  /**
   * Depois de cadastrar/editar material: o cache já foi invalidado pelo service, então só o que este uso mostra é lido
   * de novo (categorias em uso, quando é filtro; as demais listas só se esta tela as exibe).
   */
  function recarregar() {
    return carregar()
  }

  /** Opção do catálogo com o mesmo nome (ignora caixa e acento), se existir. */
  function categoriaExistente(nome: string): string | undefined {
    const alvo = normalizarTexto(nome)
    return categorias.value.find((o) => normalizarTexto(o.valor) === alvo || normalizarTexto(o.rotulo) === alvo)?.valor
  }

  /** Cadastra, recarrega as opções e devolve o valor a selecionar (o `nome` devolvido pelo servidor). Erros sobem para quem chamou. */
  async function cadastrarCategoria(nome: string): Promise<string> {
    const criada = await criarCategoriaMaterial({ nome })
    await carregarCategorias()
    return criada.nome
  }

  onMounted(() => void carregar())

  return {
    categorias,
    categoriasFiltro,
    emUsoCompleto,
    unidades,
    carregando,
    indisponivel,
    podeCadastrarCategoria,
    categoriaExistente,
    cadastrarCategoria,
    recarregar,
  }
}

export type CatalogoMaterial = ReturnType<typeof useCatalogoMaterial>
