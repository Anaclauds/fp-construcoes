import { computed, shallowRef, watch, type Ref } from 'vue'

/** Paginação no front para listas que a API devolve inteiras. */
export function usePaginacaoLocal<T>(itens: Ref<T[]>, porPagina = 8) {
  const pagina = shallowRef(1)

  const total = computed(() => itens.value.length)
  const totalPaginas = computed(() => Math.max(1, Math.ceil(total.value / porPagina)))
  const itensDaPagina = computed(() => {
    const inicio = (pagina.value - 1) * porPagina
    return itens.value.slice(inicio, inicio + porPagina)
  })

  // Lista encolheu (ex.: busca ou desativação): nunca fica numa página inexistente.
  watch(totalPaginas, (max) => {
    if (pagina.value > max) pagina.value = max
  })

  function voltarParaPrimeira() {
    pagina.value = 1
  }

  return { pagina, porPagina, total, totalPaginas, itensDaPagina, voltarParaPrimeira }
}
