import { shallowRef } from 'vue'
import { extrairMensagemErro } from '../services/api'
import { criarCacheSessao } from '../services/cache-sessao'
import { listarModulos } from '../services/usuarios.service'
import type { ModuloSistema, OpcaoModulo } from '../types'

export interface ModuloAcesso {
  modulo: ModuloSistema
  rotulo: string
}

export interface GrupoAcesso {
  rotulo: string
  modulos: ModuloAcesso[]
}

/** Agrupa pelo `grupo` da API, mantendo a ordem em que grupos e módulos chegam. */
export function agruparModulos(opcoes: OpcaoModulo[]): GrupoAcesso[] {
  const grupos = new Map<string, GrupoAcesso>()
  for (const opcao of opcoes) {
    let grupo = grupos.get(opcao.grupo)
    if (!grupo) {
      grupo = { rotulo: opcao.grupo, modulos: [] }
      grupos.set(opcao.grupo, grupo)
    }
    grupo.modulos.push({ modulo: opcao.valor, rotulo: opcao.rotulo })
  }
  return [...grupos.values()]
}

// Lista de módulos quase estática no servidor: cache de sessão (ligado ao token) compartilhado entre telas e modais.
const cacheModulos = criarCacheSessao(async () => agruparModulos(await listarModulos()))

/** Módulos de permissão (GET /usuarios/opcoes/modulos) agrupados; erro nunca vira lista vazia silenciosa. */
export function useModulosAcesso() {
  const grupos = shallowRef<GrupoAcesso[]>([])
  const carregando = shallowRef(true)
  const erro = shallowRef<string | null>(null)
  let requisicao = 0

  async function carregar() {
    const atual = ++requisicao
    carregando.value = true
    erro.value = null
    try {
      const lista = await cacheModulos.obter()
      if (atual === requisicao) grupos.value = lista
    } catch (e) {
      if (atual === requisicao) erro.value = extrairMensagemErro(e)
    } finally {
      if (atual === requisicao) carregando.value = false
    }
  }

  void carregar()

  return { grupos, carregando, erro, carregar }
}
