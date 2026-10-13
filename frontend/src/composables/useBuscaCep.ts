import { shallowRef } from 'vue'
import type { EnderecoCep } from '../types'

export interface CamposEndereco {
  cep: string
  cidade: string
  estado: string
  rua: string
  bairro: string
}

type CampoPreenchido = 'cidade' | 'estado' | 'rua' | 'bairro'

interface OpcoesBuscaCep {
  /** Campos reativos do formulário (o endereço encontrado é gravado neles). */
  campos: CamposEndereco
  /** Erros do formulário; a falha da busca aparece em `erros.cep`. */
  erros: { cep?: string }
  /** Devolve o endereço, ou null se o CEP não existe. Pode lançar erro (a mensagem de `mensagemFalha` vira o erro do campo). */
  consultar: (cep: string) => Promise<EnderecoCep | null>
  /** UFs aceitas; estado fora da lista não é preenchido. */
  ufs: readonly string[]
  /** Texto do erro do campo CEP quando `consultar` lança. */
  mensagemFalha?: (erro: unknown) => string
}

const digitos = (valor: string) => valor.replace(/\D/g, '')
const MENSAGEM_PADRAO = 'Não foi possível consultar o CEP. Preencha o endereço manualmente.'

/**
 * Botão "Buscar" do CEP: preenche cidade, estado, rua e bairro do formulário.
 * Só a última consulta vale (CEP editado durante a chamada descarta o resultado) e, se o CEP não
 * existir ou a consulta falhar, apaga apenas o que a busca anterior tinha preenchido.
 */
export function useBuscaCep({ campos, erros, consultar, ufs, mensagemFalha }: OpcoesBuscaCep) {
  const buscandoCep = shallowRef(false)

  // Valores que a busca preencheu. Se o usuário alterou o campo depois, o valor dele é mantido.
  let preenchidoPorCep: Partial<Record<CampoPreenchido, string>> = {}

  function limparEnderecoDoCep() {
    for (const chave of Object.keys(preenchidoPorCep) as CampoPreenchido[]) {
      if (campos[chave] === preenchidoPorCep[chave]) campos[chave] = ''
    }
    preenchidoPorCep = {}
  }

  function preencher(chave: CampoPreenchido, valor: string) {
    campos[chave] = valor
    preenchidoPorCep[chave] = valor
  }

  async function buscarCep() {
    const cep = digitos(campos.cep)
    if (cep.length !== 8) {
      erros.cep = 'CEP inválido. Use 8 dígitos.'
      return
    }

    buscandoCep.value = true
    try {
      const endereco = await consultar(cep)
      if (digitos(campos.cep) !== cep) return
      if (!endereco) {
        erros.cep = 'CEP não encontrado.'
        limparEnderecoDoCep()
        return
      }
      // CEPs genéricos (de cidade) vêm sem rua/bairro: o que não veio fica como está.
      if (endereco.cidade) preencher('cidade', endereco.cidade)
      if (endereco.estado && ufs.includes(endereco.estado)) preencher('estado', endereco.estado)
      if (endereco.rua) preencher('rua', endereco.rua)
      if (endereco.bairro) preencher('bairro', endereco.bairro)
    } catch (erro) {
      if (digitos(campos.cep) === cep) {
        erros.cep = mensagemFalha?.(erro) ?? MENSAGEM_PADRAO
        limparEnderecoDoCep()
      }
    } finally {
      buscandoCep.value = false
    }
  }

  return { buscandoCep, buscarCep }
}
