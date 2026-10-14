import { computed, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { LIMITE_MATERIAIS_COMPRA, listarMateriaisAtivos } from '../services/despesas.service'
import { buscarDetalheEstoque } from '../services/estoque.service'
// A API libera a lista de fornecedores para FORNECEDORES, EQUIPAMENTOS, MATERIAIS ou ESTOQUE, mas não para DESPESAS (403 tratado aqui).
import { listarFornecedoresAtivos } from '../services/fornecedores.service'
import type { FornecedorOpcaoDespesa, MaterialOpcaoDespesa } from '../types/despesa'
import { useAuth } from './useAuth'

/**
 * Fornecedores e materiais ativos para registrar uma compra. Quem só tem Despesas não enxerga nenhum dos dois
 * (a API libera `/fornecedores/opcoes/ativos` para Fornecedores, Equipamentos, Materiais e Estoque, e
 * `/materiais` para Materiais): nesse caso `semAcesso` explica o que falta em vez de mostrar uma lista vazia.
 */
export function useOpcoesCompraDespesa() {
  const { temPermissao } = useAuth()

  const podeVerFornecedores = computed(
    () =>
      temPermissao('FORNECEDORES', 'visualizar') ||
      temPermissao('EQUIPAMENTOS', 'visualizar') ||
      temPermissao('MATERIAIS', 'visualizar') ||
      temPermissao('ESTOQUE', 'visualizar'),
  )
  const podeVerMateriais = computed(() => temPermissao('MATERIAIS', 'visualizar'))
  /** O saldo do estoque (`GET /estoque/:id`) só é lido com ESTOQUE visualizar; sem ele a compra segue sem a checagem do limite. */
  const podeVerEstoque = computed(() => temPermissao('ESTOQUE', 'visualizar'))

  const fornecedores = shallowRef<FornecedorOpcaoDespesa[]>([])
  const materiais = shallowRef<MaterialOpcaoDespesa[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const recusado = shallowRef(false)
  const carregado = shallowRef(false)
  /** Há mais materiais ativos do que o limite lido: o seletor não os mostra todos. */
  const truncado = shallowRef(false)
  /** Saldo atual (`quantidadeAtual`) por material, buscado sob demanda. */
  const saldos = shallowRef<Record<string, number>>({})
  const consultados = new Set<string>()

  /** Falta acesso a fornecedores ou a materiais (por permissão local ou por 403 da API). */
  const semAcesso = computed(() => !podeVerFornecedores.value || !podeVerMateriais.value || recusado.value)

  const textoSemAcesso = computed(() => {
    const faltas: string[] = []
    if (!podeVerFornecedores.value) faltas.push('fornecedores')
    if (!podeVerMateriais.value) faltas.push('materiais')
    const lista = faltas.length > 0 ? faltas.join(' e ') : 'fornecedores e materiais'
    return `Seu acesso não permite consultar ${lista}, necessários para registrar uma compra de material. Peça ao administrador a permissão de visualização em Fornecedores e Materiais.`
  })

  async function carregar() {
    if (carregando.value || carregado.value || !podeVerFornecedores.value || !podeVerMateriais.value) return
    carregando.value = true
    erro.value = null
    try {
      const [listaFornecedores, listaMateriais] = await Promise.all([listarFornecedoresAtivos(), listarMateriaisAtivos()])
      fornecedores.value = listaFornecedores
      materiais.value = listaMateriais.itens
      truncado.value = listaMateriais.truncado
      carregado.value = true
    } catch (e) {
      const { status, mensagem } = extrairErro(e)
      if (status === 403) recusado.value = true
      else erro.value = mensagem
    } finally {
      carregando.value = false
    }
  }

  /** Texto para avisar que a lista de materiais foi cortada ('' quando está completa). */
  const textoTruncado = computed(() =>
    truncado.value
      ? `Há mais de ${LIMITE_MATERIAIS_COMPRA.toLocaleString('pt-BR')} materiais ativos: a lista está incompleta. Se não achar o material, desative os que não são mais usados.`
      : '',
  )

  /** Busca (uma vez por material) o saldo atual do estoque. Falha (403, 404, rede) deixa o saldo desconhecido. */
  async function carregarSaldo(materialId: string) {
    if (materialId === '' || !podeVerEstoque.value || consultados.has(materialId)) return
    consultados.add(materialId)
    try {
      const detalhe = await buscarDetalheEstoque(Number(materialId))
      const atual = Number(detalhe.saldo.quantidadeAtual)
      if (Number.isFinite(atual)) saldos.value = { ...saldos.value, [materialId]: atual }
    } catch {
      // Saldo desconhecido: a compra segue sem a checagem e a API continua sendo a última barreira.
    }
  }

  function carregarSaldos(materialIds: string[]) {
    return Promise.all([...new Set(materialIds)].map(carregarSaldo))
  }

  /** Saldo atual do material em unidades, ou `null` enquanto desconhecido. */
  function saldoAtual(materialId: number): number | null {
    return saldos.value[String(materialId)] ?? null
  }

  function tentarNovamente() {
    carregado.value = false
    return carregar()
  }

  return {
    fornecedores,
    materiais,
    carregando,
    erro,
    semAcesso,
    textoSemAcesso,
    podeVerEstoque,
    textoTruncado,
    carregar,
    carregarSaldo,
    carregarSaldos,
    saldoAtual,
    tentarNovamente,
  }
}

export type OpcoesCompraDespesa = ReturnType<typeof useOpcoesCompraDespesa>
