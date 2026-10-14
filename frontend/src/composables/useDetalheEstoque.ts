import { onMounted, shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { buscarDetalheEstoque } from '../services/estoque.service'
import type { DetalheEstoque } from '../types/estoque'

/** Detalhe de um material do estoque (saldo, projetos com reserva, últimas compras), carregado ao montar. */
export function useDetalheEstoque(materialId: number) {
  const detalhe = shallowRef<DetalheEstoque | null>(null)
  const carregando = shallowRef(true)
  const erro = shallowRef<string | null>(null)

  async function buscar(silencioso: boolean) {
    if (!silencioso) {
      carregando.value = true
      erro.value = null
    }
    try {
      detalhe.value = await buscarDetalheEstoque(materialId)
      erro.value = null
    } catch (e) {
      if (!silencioso) erro.value = extrairMensagemErro(e)
    } finally {
      carregando.value = false
    }
  }

  const carregar = () => buscar(false)
  /** Atualiza o saldo sem trocar a tela por "Carregando..." (um formulário aberto não perde o que foi digitado nem o foco). */
  const atualizar = () => buscar(true)

  onMounted(() => void carregar())

  return { detalhe, carregando, erro, carregar, atualizar }
}
