import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoOrcamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateServicoDto {
  @ApiProperty({ example: 'Instalacao de guarda-corpo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @ApiProperty({ enum: TipoOrcamento, example: TipoOrcamento.SERRALHERIA })
  @IsEnum(TipoOrcamento)
  categoria: TipoOrcamento;

  @ApiPropertyOptional({
    example: 'Instalacao completa, incluindo fixacao e acabamento.',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 350 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorReferencia: number;

  @ApiProperty({ example: 'Metro linear' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidadeMedida: string;
}
