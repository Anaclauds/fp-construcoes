import { onBeforeUnmount, shallowRef, type Ref } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { exportarRelatorioCobrancas } from '../services/cobrancas.service'
import type { FiltrosCobrancas, FormatoRelatorioCobrancas } from '../types'
import { useToast } from './useToast'

/** Baixa o relatório de cobranças (PDF ou Excel) com os filtros atuais da lista. */
export function useExportarCobrancas(filtros: Ref<FiltrosCobrancas>) {
  const { mostrarToast } = useToast()
  const exportando = shallowRef<FormatoRelatorioCobrancas | null>(null)
  let desmontado = false

  onBeforeUnmount(() => {
    desmontado = true
  })

  async function exportar(formato: FormatoRelatorioCobrancas) {
    if (exportando.value) return
    exportando.value = formato
    try {
      const { blob, nome } = await exportarRelatorioCobrancas(formato, filtros.value)
      if (blob.size === 0) throw new Error('O relatório veio vazio.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = nome
      document.body.appendChild(link)
      link.click()
      link.remove()
      // O download já começou; o navegador mantém o arquivo mesmo revogando a URL.
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      // Download real do arquivo (blob): aqui o aviso do Figma é verdadeiro.
      mostrarToast(formato === 'pdf' ? 'PDF baixado!' : 'Excel baixado!')
    } catch (erro) {
      mostrarToast(`Não foi possível gerar o relatório. ${extrairMensagemErro(erro)}`, 'erro')
    } finally {
      if (!desmontado) exportando.value = null
    }
  }

  return { exportando, exportar }
}
