import { PickType } from '@nestjs/swagger';
import { CreateOrcamentoDto } from './create-orcamento.dto';

export class SimularOrcamentoDto extends PickType(CreateOrcamentoDto, [
  'tipo',
  'materiais',
  'servicos',
  'desconto',
] as const) {}
