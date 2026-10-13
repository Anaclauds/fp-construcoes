import { shallowRef, watch, type Ref } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { buscarFolhaDoDia } from '../services/frequencias.service'
import type { Frequencia, Indicadores } from '../types'
import { calcularIndicadores } from '../utils/frequencia'

/** Folha do dia (todos os funcionários ativos, com ou sem registro), recarregada quando a data muda. */
export function useFolhaFrequencia(data: Ref<string>) {
  const registros = shallowRef<Frequencia[]>([])
  const indicadores = shallowRef<Indicadores>(calcularIndicadores([]))
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  /** true depois da primeira resposta da data atual; evita mostrar "vazio" antes de carregar. */
  const carregada = shallowRef(false)

  // Só a última requisição vale: trocar de data rápido não deixa resposta antiga sobrescrever a nova.
  let ultimaRequisicao = 0

  async function carregar() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null
    try {
      const folha = await buscarFolhaDoDia({ data: data.value })
      if (requisicao !== ultimaRequisicao) return
      registros.value = folha.registros
      indicadores.value = folha.indicadores
      carregada.value = true
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        registros.value = []
        indicadores.value = calcularIndicadores([])
        erro.value = extrairMensagemErro(e)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  watch(data, () => {
    carregada.value = false
    registros.value = []
    indicadores.value = calcularIndicadores([])
    void carregar()
  })

  return { registros, indicadores, carregando, erro, carregada, carregar }
}
