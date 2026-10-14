import { shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hojeIso, isoValido } from '../utils/datas'

/**
 * Data da tela guardada em `?data=YYYY-MM-DD` (link compartilhável, F5 mantém o dia).
 * Sem query ou com valor inválido vale hoje no relógio local. Atribuir à `data` navega (replace),
 * então guardas de rota (alterações não salvas) também veem a troca de dia.
 */
export function useDataDaRota(nomeRota: string) {
  const route = useRoute()
  const router = useRouter()

  const lerQuery = () => {
    const valor = route.query.data
    return typeof valor === 'string' && isoValido(valor) ? valor.slice(0, 10) : hojeIso()
  }

  const data = shallowRef(lerQuery())

  /** Data inválida na URL: a URL passa a mostrar o dia realmente exibido (hoje). */
  function normalizarUrl() {
    if (route.name !== nomeRota) return
    const naUrl = route.query.data
    if (naUrl !== undefined && naUrl !== data.value) void router.replace({ query: { ...route.query, data: data.value } })
  }

  // A rota nova já está em useRoute() enquanto este componente ainda sai da tela: ignora outras rotas.
  watch(
    () => route.query.data,
    () => {
      if (route.name !== nomeRota) return
      data.value = lerQuery()
      normalizarUrl()
    },
  )
  normalizarUrl()

  async function irParaData(nova: string) {
    if (nova === data.value) return
    await router.replace({ query: { ...route.query, data: nova } })
  }

  return { data, irParaData }
}
