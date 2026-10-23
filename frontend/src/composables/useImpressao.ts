import { onBeforeUnmount } from 'vue'

/**
 * Imprime a página atual com window.print() (sem biblioteca de PDF): o usuário escolhe a impressora
 * ou "Salvar como PDF" no diálogo do navegador. Troca o título da aba durante a impressão porque o
 * navegador o usa como nome sugerido do arquivo PDF.
 */
export function useImpressao() {
  let limpar: (() => void) | null = null

  /**
   * @param nomeArquivo título temporário do documento (vira o nome sugerido do PDF)
   * @param aoTerminar opcional; chamado quando o diálogo de impressão fecha (imprimiu, salvou ou cancelou)
   */
  function imprimir(nomeArquivo: string, aoTerminar?: () => void) {
    limpar?.()
    const tituloOriginal = document.title
    document.title = nomeArquivo

    const finalizar = () => {
      window.removeEventListener('afterprint', finalizar)
      document.title = tituloOriginal
      limpar = null
      aoTerminar?.()
    }

    window.addEventListener('afterprint', finalizar)
    limpar = () => {
      window.removeEventListener('afterprint', finalizar)
      document.title = tituloOriginal
    }

    window.print()
  }

  onBeforeUnmount(() => limpar?.())

  return { imprimir }
}
