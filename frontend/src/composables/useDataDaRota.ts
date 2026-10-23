import { shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hojeIso, isoValido } from '../utils/datas'

/**
 * Data da tela guardada em `?data=YYYY-MM-DD` (link compartilhável, F5 mantém o dia).
 * Sem query ou com valor inválido vale hoje no fuso do negócio (`hojeIso`, America/Porto_Velho), não o relógio do navegador.
 * Com `limitarAHoje`, data futura na URL também vira hoje (a API não bloqueia frequência futura, então a tela é quem limita). Atribuir à `data` navega (replace),
 * então guardas de rota (alterações não salvas) também veem a troca de dia.
 */
export function useDataDaRota(nomeRota: string, opcoes: { limitarAHoje?: boolean } = {}) {
  const route = useRoute()
  const router = useRouter()

  const lerQuery = () => {
    const valor = route.query.data
    if (typeof valor !== 'string' || !isoValido(valor)) return hojeIso()
    const dia = valor.slice(0, 10)
    // Datas ISO (YYYY-MM-DD) comparam certo como texto.
    return opcoes.limitarAHoje && dia > hojeIso() ? hojeIso() : dia
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
