import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import { listarClientes } from '../services/clientes.service'
import type { Cliente, FiltrosClientes, TipoCliente } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

export type FiltroTipoCliente = 'TODOS' | TipoCliente

/** Lista de clientes com busca (debounce), filtros de tipo e status e paginação feita pelo servidor. */
export function useListaClientes() {
  const busca = shallowRef('')
  const tipo = shallowRef<FiltroTipoCliente>('TODOS')
  const status = shallowRef<FiltroStatus>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const clientes = shallowRef<Cliente[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosClientes = { page: pagina.value, limit: POR_PAGINA }
    // CPF/CNPJ digitados com máscara viram só dígitos, que é como a API guarda.
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (tipo.value !== 'TODOS') filtros.tipo = tipo.value
    if (status.value !== 'TODOS') filtros.status = status.value

    try {
      const resposta = await listarClientes(filtros)
      if (requisicao !== ultimaRequisicao) return

      clientes.value = resposta.data
      total.value = resposta.meta.total
      // A página deixou de existir (ex.: desativou o último da página com filtro ativo): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        clientes.value = []
        total.value = 0
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  // Muda a página: busca nova no servidor.
  watch(pagina, () => void carregar())

  // Mudou o critério: volta para a primeira página (o watch acima recarrega) ou recarrega direto.
  watch([buscaAplicada, tipo, status], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, tipo, status, pagina, porPagina: POR_PAGINA, clientes, total, carregando, erro, carregar }
}
