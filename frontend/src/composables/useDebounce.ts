import { onScopeDispose, shallowRef, watch, type Ref } from 'vue'

/**
 * Devolve um ref que só acompanha `origem` depois de `atrasoMs` sem novas alterações.
 * Quem precisar aplicar um valor na hora (ex.: estado vindo da URL) pode escrever direto no ref devolvido.
 */
export function useDebounce<T>(origem: Ref<T>, atrasoMs = 300): Ref<T> {
  const valor = shallowRef(origem.value) as Ref<T>
  let temporizador: number | undefined

  watch(origem, (novo) => {
    window.clearTimeout(temporizador)
    temporizador = window.setTimeout(() => {
      valor.value = novo
    }, atrasoMs)
  })

  onScopeDispose(() => window.clearTimeout(temporizador))

  return valor
}
