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
  @ApiProperty({ example: 'Tubo 20x20' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nome: string;

  @ApiProperty({ example: 'Perfil' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria: string;

  @ApiProperty({ example: 'Metro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidadeMedida: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidadeInicial: number;

  @ApiPropertyOptional({ example: 'Perfil galvanizado para estruturas leves.' })
  @IsOptional()
  @IsString()
  observacoes?: string;
}
