import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import { rotuloLegivel } from './formatadores'

// O backend aceita texto livre nesses campos; as listas abaixo são as opções oferecidas na tela.
export const SEXOS = ['Masculino', 'Feminino']

export const SETORES = ['Administrativo', 'Serralheria', 'Calhas', 'Construção Civil']

export const FUNCOES = [
  'Administrador',
  'Secretária',
  'Serralheiro',
  'Calheiro',
  'Pedreiro',
  'Ajudante',
  'Servente',
  'Mestre de obras',
  'Outro',
]

export const TIPOS_CONTRATO = ['CLT', 'PJ','Diarista', 'Temporário']

export const GRAUS_VINCULO = ['Cônjuge', 'Pai', 'Mãe', 'Filho(a)', 'Irmão(ã)', 'Outro']

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

/**
 * Lista -> opções de select. Se o valor salvo não estiver na lista (dado antigo ou texto livre),
 * ele entra como opção extra para não ser perdido ao editar.
 */
export function montarOpcoes(lista: string[], valorAtual = ''): OpcaoCampo[] {
  const base = valorAtual && !lista.includes(valorAtual) ? [...lista, valorAtual] : lista
  // Valor legado em CAIXA_ALTA aparece legível; o valor salvo (value) não muda.
  return base.map((valor) => ({ valor, rotulo: rotuloLegivel(valor) }))
}
