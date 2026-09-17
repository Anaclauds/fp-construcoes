import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { StatusCadastro } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateClienteDto } from './create-cliente.dto';

export class UpdateClienteDto extends PartialType(CreateClienteDto) {
  @ApiPropertyOptional({ enum: StatusCadastro, example: StatusCadastro.ATIVO })
  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;
}
