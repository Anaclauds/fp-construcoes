import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusFrequencia } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class RelatorioFrequenciaQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  funcionarioId: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  dataInicial: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  dataFinal: string;

  @ApiPropertyOptional({
    enum: StatusFrequencia,
    example: StatusFrequencia.PRESENTE,
  })
  @IsOptional()
  @IsEnum(StatusFrequencia)
  status?: StatusFrequencia;

  @ApiPropertyOptional({ example: 'DETALHADO_POR_DIA' })
  @IsOptional()
  @IsString()
  tipoRelatorio?: string;
}
