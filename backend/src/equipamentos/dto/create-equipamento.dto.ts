import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const TIPOS_EQUIPAMENTO = [
  'ELETRICO',
  'MANUAL',
  'HIDRAULICO',
  'PNEUMATICO',
  'ESTRUTURA',
  'VEICULO',
  'OUTRO',
] as const;

export type TipoEquipamento = (typeof TIPOS_EQUIPAMENTO)[number];

export class CreateEquipamentoDto {
  @ApiProperty({ example: 'Serra Circular Makita' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nome: string;

  @ApiProperty({ enum: TIPOS_EQUIPAMENTO, example: 'ELETRICO' })
  @IsIn(TIPOS_EQUIPAMENTO)
  tipo: TipoEquipamento;

  @ApiProperty({ example: 'Makita' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  marca: string;

  @ApiPropertyOptional({ example: '5007MG' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  modelo?: string;

  @ApiPropertyOptional({ example: 'Revisao anual prevista para 2027.' })
  @IsOptional()
  @IsString()
  observacoes?: string;

  @ApiPropertyOptional({ example: '2022-03-10' })
  @IsOptional()
  @IsDateString({ strict: true })
  dataAquisicao?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorAquisicao?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fornecedorId?: number;
}
