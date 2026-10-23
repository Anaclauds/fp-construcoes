import { watch, type ShallowRef } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryValue } from 'vue-router'

/** Um critério da lista guardado na query string (`?busca=&status=...`). */
export interface CampoUrl {
  /** Nome do parâmetro na URL. */
  param: string
  /** Valor atual para a URL (ex.: a busca já com debounce; data só quando completa). */
  ler: () => string
  /** Aplica o valor vindo da URL (ex.: busca, que também atualiza a versão com debounce). */
  definir: (valor: string) => void
  /** Valor que não precisa aparecer na URL. */
  padrao: string
  /** Rejeita valores inválidos da URL (voltam ao padrão). */
  valido?: (valor: string) => boolean
  /** Valor que funciona na lista mas não deve ir para a URL/histórico (ex.: CPF digitado na busca). */
  naoGravarSe?: (valor: string) => boolean
}

/** Texto que parece CPF/CNPJ (só dígitos, ponto, traço, barra e espaços, com 6+ dígitos): dado pessoal, fora da URL. */
export function pareceDocumento(valor: string): boolean {
  return /^[\d.\-/\s]+$/.test(valor) && (valor.match(/\d/g)?.length ?? 0) >= 6
}

const primeiro = (valor: LocationQueryValue | LocationQueryValue[] | undefined) =>
  (Array.isArray(valor) ? valor[0] : valor) ?? ''

/**
 * Guarda filtros, busca e página da lista na URL da rota (padrão de Projetos e Cobranças): recarregar a página
 * ou voltar de outra tela reabre a lista como estava. Parâmetros inválidos viram o padrão e a URL é normalizada.
 * Chamar depois de criar os refs e antes dos `watch` da lista, para a leitura inicial não disparar consulta extra.
 */
export function useFiltrosNaUrl(nomeRota: string, campos: CampoUrl[], pagina: ShallowRef<number>) {
  const route = useRoute()
  const router = useRouter()

  function lerQuery(query: LocationQuery): { valores: string[]; pagina: number } {
    const valores = campos.map((campo) => {
      const bruto = primeiro(query[campo.param]).trim()
      return bruto !== '' && (campo.valido?.(bruto) ?? true) ? bruto : campo.padrao
    })
    const numero = Number(primeiro(query.pagina))
    return { valores, pagina: Number.isInteger(numero) && numero > 1 ? numero : 1 }
  }

  function paraQuery(valores: string[], numeroPagina: number): Record<string, string> {
    const novos: Record<string, string> = {}
    campos.forEach((campo, i) => {
      const valor = valores[i] ?? ''
      if (valor.trim() !== '' && valor !== campo.padrao && !campo.naoGravarSe?.(valor.trim())) novos[campo.param] = valor.trim()
    })
    if (numeroPagina > 1) novos.pagina = String(numeroPagina)
    return novos
  }

  const iguais = (a: LocationQuery, b: Record<string, string>) => {
    const chaves = Object.keys(a)
    return chaves.length === Object.keys(b).length && chaves.every((chave) => a[chave] === b[chave])
  }

  const atuais = () => campos.map((campo) => campo.ler())

  function aplicar(query: LocationQuery) {
    // Já navegou para outra tela (o componente ainda não desmontou): não mexe nela.
    if (route.name !== nomeRota) return
    const alvo = lerQuery(query)
    const agora = atuais()
    campos.forEach((campo, i) => {
      // Valor que de propósito não vai para a URL: a URL sem ele não significa "limpar".
      if (alvo.valores[i] === campo.padrao && campo.naoGravarSe?.(agora[i] ?? '')) return
      if (alvo.valores[i] !== agora[i]) campo.definir(alvo.valores[i] ?? campo.padrao)
    })
    if (alvo.pagina !== pagina.value) pagina.value = alvo.pagina
    const canonica = paraQuery(alvo.valores, alvo.pagina)
    if (!iguais(query, canonica)) void router.replace({ name: nomeRota, query: canonica })
  }

  function sincronizar() {
    if (route.name !== nomeRota) return
    const novos = paraQuery(atuais(), pagina.value)
    if (!iguais(route.query, novos)) void router.replace({ name: nomeRota, query: novos })
  }

  watch(() => route.query, aplicar)
  aplicar(route.query)
  watch([...campos.map((campo) => campo.ler), pagina], sincronizar)
}
