import { onMounted, shallowRef } from 'vue'
import { extrairErro } from '../services/api'
import { buscarCliente } from '../services/clientes.service'
import type { Cliente } from '../types'
import { useAuth } from './useAuth'

/**
 * Cliente completo (com endereço) de um orçamento: `GET /clientes/:id` exige acesso ao módulo Clientes.
 * Sem ele (permissão local ausente ou 403) ou com qualquer falha, `cliente` fica null e a tela usa só
 * cidade/UF do orçamento. Sem a permissão de visualizar Clientes a chamada nem é feita (evita 403 no console).
 */
export function useClienteCompleto(clienteId: number) {
  const cliente = shallowRef<Cliente | null>(null)
  const carregando = shallowRef(true)
  const semAcesso = shallowRef(false)
  const { temPermissao } = useAuth()

  async function carregar() {
    if (!temPermissao('CLIENTES', 'visualizar')) {
      cliente.value = null
      semAcesso.value = true
      carregando.value = false
      return
    }

    carregando.value = true
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
