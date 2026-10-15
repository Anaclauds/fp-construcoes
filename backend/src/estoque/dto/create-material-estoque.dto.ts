import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMaterialEstoqueDto {
  @ApiProperty({ example: 25.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @LimiteNumero(9999999999.99)
  precoReferencia: number;
  @ApiProperty({ example: 'Tubo 20x20' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @LimiteTexto(180)
  nome: string;

  @ApiProperty({ example: 'Perfil' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @LimiteTexto(100)
  categoria: string;

  @ApiProperty({ example: 'Metro' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @LimiteTexto(50)
  unidadeMedida: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @LimiteNumero(999999999.999)
  quantidadeInicial: number;

  @ApiPropertyOptional({ example: 'Perfil galvanizado para estruturas leves.' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(3000)
  observacoes?: string;
}
