import { PartialType } from '@nestjs/swagger';
import { CreateDespesaDto } from './create-despesa.dto';

export class UpdateDespesaDto extends PartialType(CreateDespesaDto) {}
