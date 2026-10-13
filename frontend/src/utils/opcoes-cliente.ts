import type { OpcaoCampo } from '../components/ui/CampoFormulario.vue'
import type { TipoCliente } from '../types'

export { SEXOS, UFS, montarOpcoes } from './opcoes-funcionario'

// O backend aceita texto livre em "cargo do responsável"; a lista abaixo é a oferecida na tela
// (valores antigos fora da lista continuam aparecendo ao editar, via montarOpcoes).
export const CARGOS_RESPONSAVEL = [
  'Proprietário',
  'Sócio',
  'Diretor',
  'Gerente',
  'Comprador',
  'Engenheiro',
  'Arquiteto',
  'Administrativo',
  'Outro',
]

export const ROTULO_TIPO: Record<TipoCliente, string> = {
  PF: 'Pessoa Física',
  PJ: 'Pessoa Jurídica',
}

export const OPCOES_TIPO: OpcaoCampo[] = [
  { valor: 'PF', rotulo: ROTULO_TIPO.PF },
  { valor: 'PJ', rotulo: ROTULO_TIPO.PJ },
]
