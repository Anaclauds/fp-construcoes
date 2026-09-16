import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ example: 'Perfil U enrijecido de aco galvanizado' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nome: string;

  @ApiProperty({ example: 'Aco e Metais' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  categoria: string;

  @ApiProperty({ example: 'Metro linear' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidadeMedida: string;

  @ApiPropertyOptional({
    example: 'Perfil estrutural utilizado em coberturas leves.',
  })
  @IsOptional()
  @IsString()
  descricao?: string;

  @ApiProperty({ example: 18.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  precoReferencia: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Opcional enquanto o modulo de fornecedores nao e cadastrado',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fornecedorPreferencialId?: number;
}
