import { isAxiosError } from 'axios'
import { api } from './api'
import type { EnderecoCep } from '../types'

interface RespostaCep {
  logradouro?: string
  bairro?: string
  cidade?: string
  estado?: string
}

/**
 * Consulta o CEP pela API do sistema (autenticada; o backend fala com o provedor de CEP).
 * Lança `Error` com mensagem pronta para o campo: 400 (CEP inválido), 404 (não encontrado) e
 * 503 (serviço indisponível) têm texto próprio.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<EnderecoCep> {
  const digitos = cep.replace(/\D/g, '')
  try {
    const { data } = await api.get<RespostaCep>(`/enderecos/cep/${digitos}`)
    return {
      rua: data.logradouro ?? '',
      bairro: data.bairro ?? '',
      cidade: data.cidade ?? '',
      estado: data.estado ?? '',
    }
  } catch (erro) {
    const status = isAxiosError(erro) ? erro.response?.status : undefined
    if (status === 400) throw new Error('CEP inválido. Use 8 dígitos.')
    if (status === 404) throw new Error('CEP não encontrado.')
    if (status === 503) throw new Error('Serviço de CEP indisponível. Preencha o endereço manualmente.')
    throw new Error('Não foi possível consultar o CEP. Preencha o endereço manualmente.')
  }
}
