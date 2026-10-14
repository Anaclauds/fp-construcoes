import { onMounted, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarCliente } from '../services/clientes.service'
import { buscarClienteParaOrcamento } from '../services/orcamentos.service'
import type { Cliente } from '../types'
import { useAuth } from './useAuth'

/** Endereço e contato do cliente do orçamento; os demais campos de `Cliente` só existem quando vêm de `/clientes`. */
export type ClienteDoOrcamentoCompleto = Pick<Cliente, 'cidade' | 'estado'> & Partial<Cliente>

/**
 * Endereço completo do cliente de um orçamento. Primeiro `GET /orcamentos/opcoes/clientes/:id` (basta o módulo
 * Orçamentos; só clientes ativos). Se a rota não existe ou o cliente não é ativo, tenta `GET /clientes/:id`, que exige
 * acesso ao módulo Clientes (sem a permissão a chamada nem é feita, evitando 403 no console). Sem nenhum dos dois, ou
 * com qualquer falha, `cliente` fica null e a tela usa só cidade/UF do orçamento.
 */
export function useClienteCompleto(clienteId: number) {
  const cliente = shallowRef<ClienteDoOrcamentoCompleto | null>(null)
  const carregando = shallowRef(true)
  const semAcesso = shallowRef(false)
  const { temPermissao } = useAuth()

  async function carregar() {
    carregando.value = true
    semAcesso.value = false
    try {
      const opcao = await buscarClienteParaOrcamento(clienteId)
      if (opcao) {
        cliente.value = opcao
        carregando.value = false
        return
      }
    } catch {
      // Cliente inativo (404) ou falha: cai no cadastro de Clientes, se o usuário puder vê-lo.
    }

    if (!temPermissao('CLIENTES', 'visualizar')) {
      cliente.value = null
      semAcesso.value = true
      carregando.value = false
      return
    }

    try {
      cliente.value = await buscarCliente(clienteId)
    } catch (e) {
      cliente.value = null
      semAcesso.value = extrairErro(e).status === 403
    } finally {
      carregando.value = false
    }
  }

  onMounted(carregar)

  return { cliente, carregando, semAcesso }
}
