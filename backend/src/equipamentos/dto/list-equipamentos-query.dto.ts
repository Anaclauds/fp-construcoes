import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TIPOS_EQUIPAMENTO } from './create-equipamento.dto';
import type { TipoEquipamento } from './create-equipamento.dto';

export class ListEquipamentosQueryDto {
  @ApiPropertyOptional({ example: 'makita' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TIPOS_EQUIPAMENTO })
  @IsOptional()
  @IsIn(TIPOS_EQUIPAMENTO)
  tipo?: TipoEquipamento;

  @ApiPropertyOptional({ enum: StatusCadastro, default: StatusCadastro.ATIVO })
  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;

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
