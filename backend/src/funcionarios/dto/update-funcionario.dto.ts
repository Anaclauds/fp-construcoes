import { PartialType } from '@nestjs/swagger';
import { CreateFuncionarioDto } from './create-funcionario.dto';

export class UpdateFuncionarioDto extends PartialType(CreateFuncionarioDto) {}
