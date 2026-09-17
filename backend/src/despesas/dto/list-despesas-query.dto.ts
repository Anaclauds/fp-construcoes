import { ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaDespesa, TipoDespesa } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListDespesasQueryDto {
  @ApiPropertyOptional({ example: 'cimento' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoDespesa })
  @IsOptional()
  @IsEnum(TipoDespesa)
  tipo?: TipoDespesa;

  @ApiPropertyOptional({ enum: CategoriaDespesa })
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDateString({ strict: true })
  dataFim?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
