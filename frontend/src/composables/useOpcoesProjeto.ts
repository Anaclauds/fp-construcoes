import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { listarMateriaisDoProjeto, listarServicosDoProjeto } from '../services/projetos.service'
import type { OpcaoMaterial, OpcaoServico } from '../types/orcamento'
import { servicosDaCategoria } from '../utils/projetos'

/**
 * Opções dos formulários de etapa e extra: serviços ativos da categoria do projeto (a API devolve as
 * de todas as categorias) e, quando pedido, os materiais ativos (sem saldo de estoque).
 */
export function useOpcoesProjeto(tipoDoProjeto: string, { materiais: comMateriais = false } = {}) {
  const servicos = shallowRef<OpcaoServico[]>([])
  const materiais = shallowRef<OpcaoMaterial[]>([])
  const carregando = shallowRef(false)
  const erro = shallowRef<string | null>(null)

  async function carregar() {
    carregando.value = true
    erro.value = null
    try {
      const [listaServicos, listaMateriais] = await Promise.all([
        listarServicosDoProjeto(),
        comMateriais ? listarMateriaisDoProjeto() : Promise.resolve([] as OpcaoMaterial[]),
      ])
      servicos.value = servicosDaCategoria(listaServicos, tipoDoProjeto)
      materiais.value = listaMateriais
    } catch (e) {
      erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  return { servicos, materiais, carregando, erro, carregar }
}
