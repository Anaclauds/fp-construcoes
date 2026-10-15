import { AparaTexto } from '../../common/validators/texto.transformer';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TipoOrcamento } from '@prisma/client';

export class OpcoesOrcamentoQueryDto {
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsEnum(TipoOrcamento)
  tipo?: TipoOrcamento;
}
