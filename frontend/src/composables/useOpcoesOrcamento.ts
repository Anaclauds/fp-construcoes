import { computed, shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarOpcoesMateriais, listarOpcoesServicos } from '../services/orcamentos.service'
import type { OpcaoMaterial, OpcaoServico, TipoOrcamento } from '../types'

/**
 * Materiais e serviços ativos que podem entrar num orçamento (`/orcamentos/opcoes/*`).
 * Serviços só valem para o tipo do orçamento (`categoria === tipo`), por isso `servicosDoTipo`.
 */
export function useOpcoesOrcamento() {
  const materiais = shallowRef<OpcaoMaterial[]>([])
  const servicos = shallowRef<OpcaoServico[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      const [listaMateriais, listaServicos] = await Promise.all([listarOpcoesMateriais(), listarOpcoesServicos()])
      materiais.value = listaMateriais
      servicos.value = listaServicos
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  const materiaisPorId = computed(() => new Map(materiais.value.map((m) => [String(m.id), m])))
  const servicosPorId = computed(() => new Map(servicos.value.map((s) => [String(s.id), s])))

  function servicosDoTipo(tipo: TipoOrcamento | ''): OpcaoServico[] {
    return tipo === '' ? [] : servicos.value.filter((s) => s.categoria === tipo)
  }

  return { materiais, servicos, carregando, erro, carregar, materiaisPorId, servicosPorId, servicosDoTipo }
}

export type OpcoesOrcamento = ReturnType<typeof useOpcoesOrcamento>
