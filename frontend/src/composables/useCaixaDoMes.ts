import { computed, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { extrairErro } from '../services/api'
import { consultarCaixa, listarCaixas } from '../services/financeiro.service'
import type { Caixa } from '../types/caixa'
import {
  MES_MINIMO,
  competenciaAtual,
  competenciaDoCaixa,
  competenciaValida,
  deslocarCompetencia,
  limitarCompetencia,
  mensagemCaixa,
} from '../utils/caixa'

/**
 * Caixa de um mês guardado em `?competencia=AAAA-MM` (link compartilhável; F5 mantém o mês). Sem query ou com
 * valor inválido vale o mês atual; meses futuros (a API não abre caixa futuro) e anteriores a `MES_MINIMO` são
 * trazidos de volta ao intervalo. Consultar não cria o caixa: mês não aberto volta com `id: 0` e `naoAberto`.
 * As setas voltam até `competenciaMinima` (o primeiro caixa existente) informada pela API.
 */
export function useCaixaDoMes(nomeRota: string) {
  const route = useRoute()
  const router = useRouter()

  const lerQuery = () => {
    const valor = route.query.competencia
    return competenciaValida(valor) ? limitarCompetencia(valor) : competenciaAtual()
  }

  const competencia = shallowRef(lerQuery())
  const resultado = shallowRef<Caixa | null>(null)
  // Só vale o caixa do mês exibido: ao trocar de mês, o anterior some até chegar o novo.
  const caixa = computed(() => (resultado.value && competenciaDoCaixa(resultado.value) === competencia.value ? resultado.value : null))
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  // Competência do caixa mais recente que existe: `undefined` = ainda não consultada; `null` = não há nenhum caixa.
  const ultimaCompetencia = shallowRef<string | null | undefined>(undefined)

  const situacao = computed(() => caixa.value?.situacao ?? null)
  const noMesAtual = computed(() => competencia.value === competenciaAtual())
  // Último limite informado pela API; antes da primeira resposta (ou sem nenhum caixa) as setas não voltam.
  const competenciaMinima = computed(() => resultado.value?.competenciaMinima ?? null)
  const podeVoltar = computed(
    () => competenciaMinima.value !== null && competencia.value > competenciaMinima.value && competencia.value > MES_MINIMO,
  )
  const podeAvancar = computed(() => competencia.value < competenciaAtual())

  // Só a última requisição vale (cliques rápidos nas setas).
  let ultimaRequisicao = 0
  let ultimaConsultaDoUltimo = 0

  /**
   * Busca o caixa mais recente (a API lista do mais novo ao mais antigo). Com ele a tela sabe se uma competência
   * ainda pode ser aberta (só depois do último caixa) e se um caixa fechado pode ser reaberto (só o último).
   * Falha na consulta deixa o valor desconhecido: a tela não bloqueia e o servidor continua validando.
   */
  async function carregarUltimo() {
    const consulta = ++ultimaConsultaDoUltimo
    try {
      const resposta = await listarCaixas({ page: 1, limit: 1 })
      if (consulta !== ultimaConsultaDoUltimo) return
      const mais = resposta.data[0]
      ultimaCompetencia.value = mais ? competenciaDoCaixa(mais) : null
    } catch {
      if (consulta === ultimaConsultaDoUltimo) ultimaCompetencia.value = undefined
    }
  }

  /** Consulta só o caixa do mês exibido (troca de mês): o "último caixa" não muda com a navegação. */
  async function carregarMes() {
    const requisicao = ++ultimaRequisicao
    carregando.value = true
    erro.value = null
    try {
      const consultado = await consultarCaixa(competencia.value)
      if (requisicao === ultimaRequisicao) resultado.value = consultado
    } catch (e) {
      if (requisicao === ultimaRequisicao) {
        resultado.value = null
        const { mensagem, codigo } = extrairErro(e)
        erro.value = mensagemCaixa(mensagem, codigo)
      }
    } finally {
      if (requisicao === ultimaRequisicao) carregando.value = false
    }
  }

  /** Carregamento inicial, "Tentar novamente" e depois de abrir/fechar/reabrir: consulta o mês e o último caixa. */
  async function carregar() {
    void carregarUltimo()
    await carregarMes()
  }

  /** Troca o resultado atual (resposta de abrir/fechar/reabrir já traz o caixa completo). */
  function aplicar(novo: Caixa) {
    // Invalida um carregar() em andamento para ele não sobrescrever o caixa recém-devolvido.
    ultimaRequisicao++
    carregando.value = false
    // Abrir um caixa novo passa a ser o último (fechar e reabrir não mudam quais caixas existem).
    const aberta = competenciaDoCaixa(novo)
    if (ultimaCompetencia.value !== undefined && (ultimaCompetencia.value === null || aberta > ultimaCompetencia.value)) {
      ultimaCompetencia.value = aberta
    }
    if (aberta === competencia.value) resultado.value = novo
    else void carregar()
  }

  async function irPara(nova: string) {
    const destino = limitarCompetencia(nova)
    if (destino === competencia.value) return
    await router.replace({ query: { ...route.query, competencia: destino } })
  }

  const anterior = () => irPara(deslocarCompetencia(competencia.value, -1))
  const proximo = () => irPara(deslocarCompetencia(competencia.value, 1))
  const irParaMesAtual = () => irPara(competenciaAtual())

  /** Mês inválido, futuro ou anterior ao mínimo na URL: a URL passa a mostrar o mês realmente exibido. */
  function normalizarUrl() {
    if (route.name !== nomeRota) return
    const naUrl = route.query.competencia
    if (naUrl !== undefined && naUrl !== competencia.value) {
      void router.replace({ query: { ...route.query, competencia: competencia.value } })
    }
  }

  // A rota nova já está em useRoute() enquanto este componente ainda sai da tela: ignora outras rotas.
  watch(
    () => route.query.competencia,
    () => {
      if (route.name !== nomeRota) return
      competencia.value = lerQuery()
      normalizarUrl()
    },
  )
  normalizarUrl()

  watch(competencia, () => {
    void carregarMes()
    // A consulta do último caixa falhou antes: tenta de novo, senão a tela ficaria sem saber se pode abrir/reabrir.
    if (ultimaCompetencia.value === undefined) void carregarUltimo()
  })

  return {
    competencia,
    caixa,
    carregando,
    erro,
    ultimaCompetencia,
    situacao,
    noMesAtual,
    podeVoltar,
    podeAvancar,
    carregar,
    aplicar,
    anterior,
    proximo,
    irParaMesAtual,
    irPara,
  }
}
