import { ApiProperty } from '@nestjs/swagger';
import { StatusOrcamento } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateStatusOrcamentoDto {
  @ApiProperty({ enum: StatusOrcamento, example: StatusOrcamento.EM_ANALISE })
  @IsEnum(StatusOrcamento)
  status: StatusOrcamento;
}
