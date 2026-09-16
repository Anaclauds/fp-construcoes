import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListFuncionariosQueryDto {
  @ApiPropertyOptional({ example: 'Francisco' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: StatusCadastro, example: StatusCadastro.ATIVO })
  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
