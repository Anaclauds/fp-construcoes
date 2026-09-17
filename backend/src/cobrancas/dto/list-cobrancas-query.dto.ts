import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCobranca, TipoOrcamento } from '@prisma/client';
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

export class ListCobrancasQueryDto {
  @ApiPropertyOptional({ example: 'Joao' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoOrcamento })
  @IsOptional()
  @IsEnum(TipoOrcamento)
  tipo?: TipoOrcamento;

  @ApiPropertyOptional({ enum: StatusCobranca })
  @IsOptional()
  @IsEnum(StatusCobranca)
  status?: StatusCobranca;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-09-30' })
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
