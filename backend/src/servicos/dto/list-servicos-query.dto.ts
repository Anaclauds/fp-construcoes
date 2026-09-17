import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro, TipoOrcamento } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListServicosQueryDto {
  @ApiPropertyOptional({ example: 'guarda-corpo' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoOrcamento })
  @IsOptional()
  @IsEnum(TipoOrcamento)
  categoria?: TipoOrcamento;

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
