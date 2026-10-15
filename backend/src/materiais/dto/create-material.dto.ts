import { Max as LimiteNumero } from 'class-validator';
import {
  AparaTexto,
  VazioComoNulo,
} from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
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
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @LimiteTexto(180)
  nome: string;

  @ApiProperty({ example: 'Aco e Metais' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @LimiteTexto(100)
  categoria: string;

  @ApiProperty({ example: 'Metro linear' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @LimiteTexto(50)
  unidadeMedida: string;

  @ApiPropertyOptional({
    example: 'Perfil estrutural utilizado em coberturas leves.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(1000)
  descricao?: string;

  @ApiProperty({ example: 18.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @LimiteNumero(9999999999.99)
  precoReferencia: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Opcional enquanto o modulo de fornecedores nao e cadastrado',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @VazioComoNulo()
  fornecedorPreferencialId?: number;
}
