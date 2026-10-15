import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusFrequencia } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

export class ListFrequenciasQueryDto {
  @ApiPropertyOptional({ example: '2026-08-20' })
  @IsOptional()
  @IsDataSomenteDia()
  data?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  funcionarioId?: number;

  @ApiPropertyOptional({
    enum: StatusFrequencia,
    example: StatusFrequencia.PRESENTE,
  })
  @IsOptional()
  @IsEnum(StatusFrequencia)
  status?: StatusFrequencia;
}
