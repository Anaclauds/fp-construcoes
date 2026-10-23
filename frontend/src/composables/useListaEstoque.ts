import { shallowRef, watch } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarEstoque } from '../services/estoque.service'
import type { FiltrosEstoque, IndicadoresEstoque, ItemEstoque } from '../types/estoque'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'
import { useFiltrosNaUrl } from './useFiltrosNaUrl'

// Figma: "Mostrando 6 de 8 registros" (a tabela com indicadores acima comporta 6 linhas).
const POR_PAGINA = 6
const ATRASO_BUSCA_MS = 300

/** Gerenciar Estoque: materiais ativos com saldo, indicadores do filtro atual, busca, categoria e paginação do servidor. */
export function useListaEstoque() {
  const busca = shallowRef('')
  const categoria = shallowRef('TODAS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const itens = shallowRef<ItemEstoque[]>([])
  const indicadores = shallowRef<IndicadoresEstoque | null>(null)
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  let ultimaRequisicao = 0

  // Busca, categoria e página ficam na URL: recarregar ou voltar de outra tela reabre a lista como estava.
  useFiltrosNaUrl(
    'estoque',
    [
      {
        param: 'busca',
        ler: () => buscaAplicada.value.trim(),
        definir: (valor) => {
          busca.value = valor
          buscaAplicada.value = valor // na hora: senão a URL voltaria a receber a busca antiga
        },
        padrao: '',
      },
      { param: 'categoria', ler: () => categoria.value, definir: (valor) => (categoria.value = valor), padrao: 'TODAS' },
    ],
    pagina,
  )

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosEstoque = { page: pagina.value, limit: POR_PAGINA }
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (categoria.value !== 'TODAS') filtros.categoria = categoria.value

    try {
      const resposta = await listarEstoque(filtros)
      if (requisicao !== ultimaRequisicao) return
      itens.value = resposta.data
      total.value = resposta.meta.total
      indicadores.value = resposta.indicadores
      if (resposta.data.length === 0 && pagina.value > 1) pagina.value = Math.max(1, resposta.meta.totalPages)
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        itens.value = []
        total.value = 0
        indicadores.value = null
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch(pagina, () => void carregar())

  watch([buscaAplicada, categoria], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, categoria, pagina, porPagina: POR_PAGINA, itens, indicadores, total, carregando, erro, carregar }
}
