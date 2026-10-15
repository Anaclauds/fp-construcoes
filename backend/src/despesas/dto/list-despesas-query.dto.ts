import { AparaTexto } from '../../common/validators/texto.transformer';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TipoDespesa } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListDespesasQueryDto {
  @ApiPropertyOptional({ example: 'cimento' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoDespesa })
  @IsOptional()
  @IsEnum(TipoDespesa)
  tipo?: TipoDespesa;

  @ApiPropertyOptional({ example: 'FRETE' })
  @IsOptional()
  @IsString()
  categoria?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fornecedorId?: number;

  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsDataSomenteDia()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-08-31' })
  @IsOptional()
  @IsDataSomenteDia()
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
