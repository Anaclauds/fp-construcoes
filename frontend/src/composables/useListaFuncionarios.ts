import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import { listarFuncionarios } from '../services/funcionarios.service'
import type { FiltrosFuncionarios, Funcionario } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

/** Lista de funcionários com busca (debounce), filtro de status e paginação feita pelo servidor. */
export function useListaFuncionarios() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatus>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)
  const pagina = shallowRef(1)

  const funcionarios = shallowRef<Funcionario[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosFuncionarios = { page: pagina.value, limit: POR_PAGINA }
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    if (status.value !== 'TODOS') filtros.status = status.value

    try {
      const resposta = await listarFuncionarios(filtros)
      if (requisicao !== ultimaRequisicao) return

      funcionarios.value = resposta.data
      total.value = resposta.meta.total
      // A página deixou de existir (ex.: desativou o último da página com filtro ativo): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        funcionarios.value = []
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
  watch([buscaAplicada, status], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, status, pagina, porPagina: POR_PAGINA, funcionarios, total, carregando, erro, carregar }
}
