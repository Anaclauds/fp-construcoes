import { PartialType } from '@nestjs/swagger';
import { CreateOrcamentoDto } from './create-orcamento.dto';

export class UpdateOrcamentoDto extends PartialType(CreateOrcamentoDto) {}
