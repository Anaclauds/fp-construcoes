import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
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
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @LimiteTexto(180)
  nome: string;

  @ApiProperty({ enum: TipoOrcamento, example: TipoOrcamento.SERRALHERIA })
  @IsEnum(TipoOrcamento)
  categoria: TipoOrcamento;

  @ApiPropertyOptional({
    example: 'Instalacao completa, incluindo fixacao e acabamento.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(1000)
  descricao?: string;

  @ApiProperty({ example: 350 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @LimiteNumero(9999999999.99)
  valorReferencia: number;

  @ApiProperty({ example: 'Metro linear' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @LimiteTexto(50)
  unidadeMedida: string;
}
