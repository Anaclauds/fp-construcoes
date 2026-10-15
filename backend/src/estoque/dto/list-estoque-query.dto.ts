import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListEstoqueQueryDto {
  @ApiPropertyOptional({ example: 'tubo' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ example: 'Perfil' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(100)
  categoria?: string;

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
