import { onBeforeUnmount, onMounted, shallowRef, type Ref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { sessaoExpirada } from '../services/sessao'

/**
 * Impede perder alterações sem querer: ao sair da rota (ou trocar a query, como a data) com `sujo`
 * verdadeiro, abre uma confirmação (`aberto`) e só segue se o usuário responder que quer sair.
 * Fechar a aba/recarregar usa o aviso padrão do navegador. Use dentro de um componente de rota.
 */
export function useAvisoAlteracoes(sujo: Ref<boolean>) {
  const aberto = shallowRef(false)
  let resolver: ((sair: boolean) => void) | null = null

  function perguntar(): Promise<boolean> {
    // Segunda navegação enquanto a pergunta está aberta: recusa a anterior.
    resolver?.(false)
    aberto.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function responder(sair: boolean) {
    aberto.value = false
    resolver?.(sair)
    resolver = null
  }

  // Sessão expirada (401): não há o que salvar mesmo, então a saída para o login não pede confirmação.
  const guarda = () => (sujo.value && !sessaoExpirada.value ? perguntar() : true)
  onBeforeRouteLeave(guarda)
  onBeforeRouteUpdate(guarda)

  function aoFecharAba(evento: BeforeUnloadEvent) {
    if (!sujo.value) return
    evento.preventDefault()
    // Navegadores antigos exigem returnValue para mostrar o aviso.
    evento.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', aoFecharAba))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', aoFecharAba))

  return { aberto, responder }
}
