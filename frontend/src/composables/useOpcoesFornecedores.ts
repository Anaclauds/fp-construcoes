import { computed, onMounted, shallowRef } from 'vue'
import type { OpcaoAutocomplete } from '../components/ui/CampoAutocomplete.vue'
import { listarFornecedoresAtivos } from '../services/fornecedores.service'
import type { OpcaoFornecedor } from '../types/fornecedor'
import { formatarCnpj } from '../utils/formatadores'

/**
 * Fornecedores ativos para o campo "Fornecedor" de material e equipamento (`GET /fornecedores/opcoes/ativos`).
 * Se a lista não carregar (sem permissão, API fora), `indisponivel` fica verdadeiro e o campo avisa em vez de travar o formulário.
 */
export function useOpcoesFornecedores() {
  const fornecedores = shallowRef<OpcaoFornecedor[]>([])
  const carregando = shallowRef(false)
  const indisponivel = shallowRef(false)

  const opcoes = computed<OpcaoAutocomplete[]>(() =>
    fornecedores.value.map((f) => ({
      valor: String(f.id),
      rotulo: f.nomeFantasia,
      detalhe: `${f.razaoSocial} · ${formatarCnpj(f.cnpj)}`,
    })),
  )

  async function carregar() {
    carregando.value = true
    indisponivel.value = false
    try {
      fornecedores.value = await listarFornecedoresAtivos()
    } catch {
      indisponivel.value = true
    } finally {
      carregando.value = false
    }
  }

  onMounted(() => void carregar())

  return { opcoes, carregando, indisponivel, recarregar: carregar }
}
