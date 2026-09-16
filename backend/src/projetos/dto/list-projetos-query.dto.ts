import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusProjeto, TipoOrcamento } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListProjetosQueryDto {
  @ApiPropertyOptional({ example: 'ampliacao' })
  @IsOptional()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: StatusProjeto })
  @IsOptional()
  @IsEnum(StatusProjeto)
  status?: StatusProjeto;

  @ApiPropertyOptional({ enum: TipoOrcamento })
  @IsOptional()
  @IsEnum(TipoOrcamento)
  tipo?: TipoOrcamento;

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
