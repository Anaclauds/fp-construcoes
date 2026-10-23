import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import { listarUsuarios } from '../services/usuarios.service'
import type { FiltrosUsuarios, Usuario } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { useDebounce } from './useDebounce'
import { pareceDocumento, useFiltrosNaUrl } from './useFiltrosNaUrl'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

/** Lista de usuários com busca (debounce), filtro de status e paginação feita pelo servidor. */
export function useListaUsuarios() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatus>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)

  const pagina = shallowRef(1)

  const usuarios = shallowRef<Usuario[]>([])
  const total = shallowRef(0)
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosUsuarios = {}
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo
    // O servidor já trata ATIVO/INATIVO considerando usuário e funcionário.
    if (status.value !== 'TODOS') filtros.status = status.value

    try {
      const resposta = await listarUsuarios({ ...filtros, page: pagina.value, limit: POR_PAGINA })
      if (requisicao !== ultimaRequisicao) return

      usuarios.value = resposta.data
      total.value = resposta.meta.total
      // A página deixou de existir (ex.: desativou o último da página com filtro ativo): volta para a última.
      if (resposta.data.length === 0 && pagina.value > 1) {
        pagina.value = Math.max(1, resposta.meta.totalPages)
      }
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        usuarios.value = []
        total.value = 0
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  // Busca, status e página ficam na URL: recarregar (F5) ou voltar de outra tela reabre a lista como estava.
  // Antes dos `watch` abaixo, para a leitura inicial não consultar duas vezes.
  useFiltrosNaUrl(
    'usuarios',
    [
      {
        param: 'busca',
        ler: () => buscaAplicada.value.trim(),
        naoGravarSe: pareceDocumento,
        definir: (valor) => {
          busca.value = valor
          buscaAplicada.value = valor // na hora: senão a URL voltaria a receber a busca antiga
        },
        padrao: '',
      },
      {
        param: 'status',
        ler: () => status.value,
        definir: (valor) => (status.value = valor as FiltroStatus),
        padrao: 'TODOS',
        valido: (valor) => valor === 'ATIVO' || valor === 'INATIVO',
      },
    ],
    pagina,
  )

  // Muda a página: busca nova no servidor.
  watch(pagina, () => void carregar())

  // Mudou o critério: volta para a primeira página (o watch acima recarrega) ou recarrega direto.
  watch([buscaAplicada, status], () => {
    if (pagina.value !== 1) pagina.value = 1
    else void carregar()
  })

  return { busca, status, pagina, porPagina: POR_PAGINA, usuarios, total, carregando, erro, carregar }
}
