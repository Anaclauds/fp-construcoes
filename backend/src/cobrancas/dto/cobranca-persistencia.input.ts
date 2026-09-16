import { CreateCobrancaDto } from './create-cobranca.dto';

export type CobrancaPersistenciaInput = Omit<CreateCobrancaDto, 'valorBase'> & {
  desconto: number;
  acrescimo: number;
  valorTotal: number;
};
