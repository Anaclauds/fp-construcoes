import { ApiProperty } from '@nestjs/swagger';
import { StatusProjeto } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatusProjetoDto {
  @ApiProperty({
    enum: [StatusProjeto.CONCLUIDO, StatusProjeto.CANCELADO],
    example: StatusProjeto.CONCLUIDO,
  })
  @IsEnum(StatusProjeto)
  status: StatusProjeto;
}
