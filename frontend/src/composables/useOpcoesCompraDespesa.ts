import { computed, shallowRef, watch } from 'vue'
import { extrairErro } from '../services/api'
import { listarOpcoesMateriaisCompra } from '../services/despesas.service'
import { buscarDetalheEstoque } from '../services/estoque.service'
import { listarFornecedoresAtivos } from '../services/fornecedores.service'
import type { FornecedorOpcaoDespesa, MaterialOpcaoDespesa } from '../types/despesa'
import { useAuth } from './useAuth'
import { useDebounce } from './useDebounce'

const POR_PAGINA = 20
const ATRASO_BUSCA_MS = 300

/**
 * Fornecedores e materiais para registrar uma compra. As duas consultas aceitam DESPESAS visualizar
 * (`/fornecedores/opcoes/ativos` e `/despesas/opcoes/materiais`), então um perfil só de Despesas basta.
 * Os materiais vêm paginados (20 por vez) e buscados no servidor enquanto o usuário digita (com atraso); os saldos
 * do estoque acompanham cada material, e os já vistos ficam guardados para a linha da compra continuar mostrando o nome.
 */
export function useOpcoesCompraDespesa() {
  const { temPermissao } = useAuth()

  const podeConsultar = computed(() => temPermissao('DESPESAS', 'visualizar'))
  /** O saldo de um material fora da lista (ex.: item de uma compra em edição) só é lido com ESTOQUE visualizar. */
  const podeVerEstoque = computed(() => temPermissao('ESTOQUE', 'visualizar'))

  const fornecedores = shallowRef<FornecedorOpcaoDespesa[]>([])
  const carregandoFornecedores = shallowRef(false)
  const erroFornecedores = shallowRef<string | null>(null)

  /** Resultado da busca atual (a lista que o seletor mostra). */
  const materiais = shallowRef<MaterialOpcaoDespesa[]>([])
  const totalMateriais = shallowRef(0)
  const carregandoMateriais = shallowRef(false)
  const erroMateriais = shallowRef<string | null>(null)
  /** Todo material já devolvido pela API nesta sessão, por id. */
  const conhecidos = shallowRef<ReadonlyMap<number, MaterialOpcaoDespesa>>(new Map())

  const recusado = shallowRef(false)
  const carregado = shallowRef(false)
  let fornecedoresCarregados = false

  const busca = shallowRef('')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  let ultimaRequisicao = 0

  /** Saldo atual lido do estoque, só para materiais que a busca não trouxe. */
  const saldos = shallowRef<Record<string, number>>({})
  const consultados = new Set<string>()

  const semAcesso = computed(() => !podeConsultar.value || recusado.value)

  const textoSemAcesso = computed(
    () =>
      'Seu acesso não permite consultar fornecedores e materiais, necessários para registrar uma compra de material. Peça ao administrador a permissão de visualização em Despesas.',
  )

  /** Carregando fornecedores ou materiais. */
  const carregando = computed(() => carregandoFornecedores.value || carregandoMateriais.value)
  const erro = computed(() => erroFornecedores.value ?? erroMateriais.value)

  /** Aviso quando a busca tem mais resultados do que os exibidos ('' quando a lista está completa). */
  const textoParcial = computed(() =>
    totalMateriais.value > materiais.value.length
      ? `Mostrando ${materiais.value.length} de ${totalMateriais.value.toLocaleString('pt-BR')} materiais. Digite o nome para refinar a busca.`
      : '',
  )

  function lembrar(lista: MaterialOpcaoDespesa[]) {
    const mapa = new Map(conhecidos.value)
    for (const material of lista) mapa.set(material.id, material)
    conhecidos.value = mapa
  }

  function tratarRecusa(e: unknown): string | null {
    const { status, mensagem } = extrairErro(e)
    if (status === 403) {
      recusado.value = true
      return null
    }
    return mensagem
  }

  /** Fornecedores ativos (também usados na despesa diversa, onde o fornecedor é opcional). Carrega uma vez. */
  async function carregarFornecedores() {
    if (fornecedoresCarregados || carregandoFornecedores.value || !podeConsultar.value) return
    fornecedoresCarregados = true
    carregandoFornecedores.value = true
    erroFornecedores.value = null
    try {
      fornecedores.value = await listarFornecedoresAtivos()
    } catch (e) {
      erroFornecedores.value = tratarRecusa(e)
    } finally {
      carregandoFornecedores.value = false
    }
  }

  /** Consulta a primeira página de materiais para a busca atual. Só a última requisição vale. */
  async function consultarMateriais() {
    const requisicao = ++ultimaRequisicao
    carregandoMateriais.value = true
    erroMateriais.value = null
    try {
      const termo = buscaAplicada.value.trim()
      const resposta = await listarOpcoesMateriaisCompra({
        busca: termo || undefined,
        page: 1,
        limit: POR_PAGINA,
      })
      if (requisicao !== ultimaRequisicao) return
      materiais.value = resposta.data
      totalMateriais.value = resposta.meta.total
      lembrar(resposta.data)
    } catch (e) {
      if (requisicao === ultimaRequisicao) erroMateriais.value = tratarRecusa(e)
    } finally {
      if (requisicao === ultimaRequisicao) carregandoMateriais.value = false
    }
  }

  /** Fornecedores e primeira página de materiais (compra de material). */
  async function carregar() {
    if (carregado.value || !podeConsultar.value) return
    carregado.value = true
    await Promise.all([carregarFornecedores(), consultarMateriais()])
  }

  function tentarNovamente() {
    carregado.value = false
    fornecedoresCarregados = false
    recusado.value = false
    return carregar()
  }

  /** Texto digitado no seletor de material: busca no servidor depois de uma pausa. */
  function buscarMateriais(texto: string) {
    busca.value = texto
  }

  /** Ao abrir o seletor, volta à lista inicial (a busca de outra linha não deve valer aqui). */
  function reiniciarBusca() {
    if (busca.value === '' && buscaAplicada.value === '') return
    busca.value = ''
    buscaAplicada.value = ''
  }

  watch(buscaAplicada, () => {
    if (carregado.value && !recusado.value) void consultarMateriais()
  })

  /** Busca (uma vez por material) o saldo do estoque quando a busca não o trouxe. Falha deixa o saldo desconhecido. */
  async function carregarSaldo(materialId: string) {
    if (materialId === '' || consultados.has(materialId) || conhecidos.value.has(Number(materialId))) return
    if (!podeVerEstoque.value) return
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
    return conhecidos.value.get(materialId)?.quantidadeAtual ?? saldos.value[String(materialId)] ?? null
  }

  return {
    fornecedores,
    materiais,
    conhecidos,
    carregando,
    carregandoMateriais,
    erro,
    semAcesso,
    textoSemAcesso,
    textoParcial,
    carregar,
    carregarFornecedores,
    buscarMateriais,
    reiniciarBusca,
    carregarSaldos,
    saldoAtual,
    tentarNovamente,
  }
}

export type OpcoesCompraDespesa = ReturnType<typeof useOpcoesCompraDespesa>
