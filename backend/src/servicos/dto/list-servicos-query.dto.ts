import { AparaTexto } from '../../common/validators/texto.transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro, TipoOrcamento } from '@prisma/client';
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

export class ListServicosQueryDto {
  @ApiPropertyOptional({ example: 'guarda-corpo' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoOrcamento })
  @IsOptional()
  @IsEnum(TipoOrcamento)
  categoria?: TipoOrcamento;

  @ApiPropertyOptional({ enum: StatusCadastro, default: StatusCadastro.ATIVO })
  @IsOptional()
  @IsIn([...Object.values(StatusCadastro), 'TODOS'])
  status?: StatusCadastro | 'TODOS';

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
