import { shallowRef, watch } from 'vue'
import type { FiltroStatus } from '../components/ui/CardBuscaFiltro.vue'
import { extrairMensagemErro } from '../services/api'
import { listarUsuarios } from '../services/usuarios.service'
import type { FiltrosUsuarios, Usuario } from '../types'
import { termoDeBusca } from '../utils/formatadores'
import { statusDoUsuario } from '../utils/usuarios'
import { useDebounce } from './useDebounce'
import { usePaginacaoLocal } from './usePaginacaoLocal'

const POR_PAGINA = 8
const ATRASO_BUSCA_MS = 300

/** Lista de usuários com busca (debounce), filtro de status e paginação no front. */
export function useListaUsuarios() {
  const busca = shallowRef('')
  const status = shallowRef<FiltroStatus>('TODOS')
  const buscaAplicada = useDebounce(busca, ATRASO_BUSCA_MS)

  const usuarios = shallowRef<Usuario[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  const paginacao = usePaginacaoLocal(usuarios, POR_PAGINA)

  // Só a última requisição vale: respostas antigas (busca digitada rápido) são descartadas.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null

    const filtros: FiltrosUsuarios = {}
    const termo = termoDeBusca(buscaAplicada.value.trim())
    if (termo) filtros.busca = termo

    try {
      // O filtro de status é local: usuário de funcionário inativo conta como inativo (ver statusDoUsuario).
      const lista = (await listarUsuarios(filtros)).filter(
        (usuario) => status.value === 'TODOS' || statusDoUsuario(usuario) === status.value,
      )
      if (requisicao === ultimaRequisicao) usuarios.value = lista
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        usuarios.value = []
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch([buscaAplicada, status], () => {
    paginacao.voltarParaPrimeira()
    void carregar()
  })

  return { busca, status, usuarios, carregando, erro, carregar, ...paginacao }
}
