import { computed, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { listarMateriaisAtivos } from '../services/despesas.service'
// A API libera a lista de fornecedores para FORNECEDORES, EQUIPAMENTOS, MATERIAIS ou ESTOQUE, mas não para DESPESAS (403 tratado aqui).
import { listarFornecedoresAtivos } from '../services/fornecedores.service'
import type { FornecedorOpcaoDespesa, MaterialOpcaoDespesa } from '../types/despesa'
import { useAuth } from './useAuth'

/**
 * Fornecedores e materiais ativos para registrar uma compra. Quem só tem Despesas não enxerga nenhum dos dois
 * (a API libera `/fornecedores/opcoes/ativos` para Fornecedores, Equipamentos, Materiais e Estoque, e
 * `/materiais` para Materiais): nesse caso `semAcesso` explica o que falta em vez de mostrar uma lista vazia.
 */
export function useOpcoesCompraDespesa() {
  const { temPermissao } = useAuth()

  const podeVerFornecedores = computed(
    () =>
      temPermissao('FORNECEDORES', 'visualizar') ||
      temPermissao('EQUIPAMENTOS', 'visualizar') ||
      temPermissao('MATERIAIS', 'visualizar') ||
      temPermissao('ESTOQUE', 'visualizar'),
  )
  const podeVerMateriais = computed(() => temPermissao('MATERIAIS', 'visualizar'))

  const fornecedores = shallowRef<FornecedorOpcaoDespesa[]>([])
  const materiais = shallowRef<MaterialOpcaoDespesa[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)
  const recusado = shallowRef(false)
  const carregado = shallowRef(false)

  /** Falta acesso a fornecedores ou a materiais (por permissão local ou por 403 da API). */
  const semAcesso = computed(() => !podeVerFornecedores.value || !podeVerMateriais.value || recusado.value)

  const textoSemAcesso = computed(() => {
    const faltas: string[] = []
    if (!podeVerFornecedores.value) faltas.push('fornecedores')
    if (!podeVerMateriais.value) faltas.push('materiais')
    const lista = faltas.length > 0 ? faltas.join(' e ') : 'fornecedores e materiais'
    return `Seu acesso não permite consultar ${lista}, necessários para registrar uma compra de material. Peça ao administrador a permissão de visualização em Fornecedores e Materiais.`
  })

  async function carregar() {
    if (carregando.value || carregado.value || !podeVerFornecedores.value || !podeVerMateriais.value) return
    carregando.value = true
    erro.value = null
    try {
      const [listaFornecedores, listaMateriais] = await Promise.all([listarFornecedoresAtivos(), listarMateriaisAtivos()])
      fornecedores.value = listaFornecedores
      materiais.value = listaMateriais
      carregado.value = true
    } catch (e) {
      const { status, mensagem } = extrairErro(e)
      if (status === 403) recusado.value = true
      else erro.value = mensagem
    } finally {
      carregando.value = false
    }
  }

  function tentarNovamente() {
    carregado.value = false
    return carregar()
  }

  return { fornecedores, materiais, carregando, erro, semAcesso, textoSemAcesso, carregar, tentarNovamente }
}

export type OpcoesCompraDespesa = ReturnType<typeof useOpcoesCompraDespesa>
