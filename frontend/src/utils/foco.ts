/**
 * Leva o foco ao primeiro elemento que casa com `seletor` dentro de `raiz`, rolando até ele para o centro
 * da área visível (sem isso o navegador alinha o campo ao topo e o título/rótulo ficam cortados).
 */
export function focarPrimeiroErro(
  raiz: HTMLElement | null | undefined,
  seletor = '[aria-invalid="true"]',
): void {
  const alvo = raiz?.querySelector<HTMLElement>(seletor)
  if (!alvo) return
  alvo.scrollIntoView({ block: 'center' })
  alvo.focus({ preventScroll: true })
}
