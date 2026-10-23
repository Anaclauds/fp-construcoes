import { computed, shallowRef, watch, type Ref } from 'vue'
import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { listarMunicipios } from '../services/ibge.service'
import { normalizarTexto } from '../utils/formatadores'
import { UFS } from '../utils/opcoes-funcionario'

/**
 * Cidades da UF escolhida (IBGE) para o select de cidade.
 * - Troca de UF busca a lista nova (cada UF é buscada uma vez por sessão da aba).
 * - A cidade já escolhida/preenchida pelo CEP é ajustada para o nome oficial da lista, mesmo com
 *   acento ou caixa diferentes ("ji-parana" -> "Ji-Paraná"); se não existir na lista, continua como
 *   opção extra para o dado não se perder.
 * - Se o IBGE falhar, `indisponivel` fica verdadeiro e a tela deve oferecer campo de texto livre.
 */
export function useCidadesDoEstado(
  estado: Ref<string>,
  cidade: Ref<string>,
  /**
   * Chamado quando a cidade foi trocada pelo nome oficial da lista. Quem tem um valor "original" para comparar (formulário de
   * edição) o atualiza aqui: o ajuste automático ao abrir não conta como alteração do usuário nem vai no PATCH.
   */
  aoNormalizar?: (anterior: string, oficial: string) => void,
) {
  const nomes = shallowRef<string[]>([])
  const carregando = shallowRef(false)
  const indisponivel = shallowRef(false)

  // Só a última consulta vale (troca rápida de UF).
  let ultima = 0

  async function carregar(uf: string) {
    const requisicao = ++ultima
    nomes.value = []
    indisponivel.value = false

    if (!UFS.includes(uf)) {
      carregando.value = false
      return
    }

    carregando.value = true
    try {
      const lista = await listarMunicipios(uf)
      if (requisicao === ultima) nomes.value = lista
    } catch {
      if (requisicao === ultima) indisponivel.value = true
    } finally {
      if (requisicao === ultima) carregando.value = false
    }
  }

  watch(estado, (uf) => void carregar(uf), { immediate: true })

  // Lista carregada (ou cidade alterada): troca o texto pelo nome oficial equivalente.
  watch([nomes, cidade], () => {
    const atual = cidade.value
    if (!atual || nomes.value.length === 0 || nomes.value.includes(atual)) return
    const alvo = normalizarTexto(atual)
    const oficial = nomes.value.find((nome) => normalizarTexto(nome) === alvo)
    if (!oficial) return
    cidade.value = oficial
    aoNormalizar?.(atual, oficial)
  })

  const opcoes = computed<OpcaoCampo[]>(() => {
    const lista = nomes.value
    const atual = cidade.value
    const extra = atual && !lista.includes(atual) ? [atual] : []
    return [...extra, ...lista].map((nome) => ({ valor: nome, rotulo: nome }))
  })

  return { opcoes, carregando, indisponivel }
}
