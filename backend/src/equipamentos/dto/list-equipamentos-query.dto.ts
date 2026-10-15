import { AparaTexto } from '../../common/validators/texto.transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TIPOS_EQUIPAMENTO } from './create-equipamento.dto';
import type { TipoEquipamento } from './create-equipamento.dto';

export class ListEquipamentosQueryDto {
  @ApiPropertyOptional({ example: 'makita' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TIPOS_EQUIPAMENTO })
  @IsOptional()
  @IsIn(TIPOS_EQUIPAMENTO)
  tipo?: TipoEquipamento;

  @ApiPropertyOptional({
    enum: ['ATIVO', 'INATIVO', 'TODOS'],
    default: StatusCadastro.ATIVO,
  })
  @IsOptional()
  @IsIn(['ATIVO', 'INATIVO', 'TODOS'])
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
