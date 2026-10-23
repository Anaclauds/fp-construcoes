import { shallowRef } from 'vue'

/** Abaixo disto o menu lateral vira uma gaveta sobreposta (celular); acima, continua fixo ao lado do conteúdo. */
const LARGURA_MAXIMA_CELULAR = 767

const consulta = window.matchMedia(`(max-width: ${LARGURA_MAXIMA_CELULAR}px)`)

// Estado em escopo de módulo: o botão do topo (App.vue) e a gaveta (AppSidebar) compartilham o mesmo.
const telaEstreita = shallowRef(consulta.matches)
const menuMovelAberto = shallowRef(false)

consulta.addEventListener('change', (evento) => {
  telaEstreita.value = evento.matches
  // Voltou para a tela larga (girou o aparelho, redimensionou): a gaveta deixa de existir.
  if (!evento.matches) menuMovelAberto.value = false
})

function abrirMenuMovel() {
  if (telaEstreita.value) menuMovelAberto.value = true
}

function fecharMenuMovel() {
  menuMovelAberto.value = false
}

/** Estado da gaveta do menu em telas estreitas (< 768px). */
export function useMenuMovel() {
  return { telaEstreita, menuMovelAberto, abrirMenuMovel, fecharMenuMovel }
}
