import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListMateriaisQueryDto {
  @ApiPropertyOptional({ example: 'MAT-001' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ example: 'Aco e Metais' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(100)
  categoria?: string;

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
