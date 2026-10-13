import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'

// O backend aceita texto livre nesses campos; as listas abaixo são as opções oferecidas na tela.
export const SEXOS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar']

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
  'Eletricista',
  'Pintor',
  'Motorista',
  'Outro',
]

export const TIPOS_CONTRATO = ['CLT', 'Diarista', 'Autônomo', 'Temporário', 'Estágio', 'PJ']

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
  return base.map((valor) => ({ valor, rotulo: valor }))
}
