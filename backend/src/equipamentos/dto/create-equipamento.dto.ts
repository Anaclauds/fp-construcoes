import {
  AparaTexto,
  VazioComoNulo,
} from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @LimiteTexto(180)
  nome: string;

  @ApiProperty({ enum: TIPOS_EQUIPAMENTO, example: 'ELETRICO' })
  @IsIn(TIPOS_EQUIPAMENTO)
  tipo: TipoEquipamento;

  @ApiProperty({ example: 'Makita' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @LimiteTexto(100)
  marca: string;

  @ApiPropertyOptional({ example: '5007MG' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(80)
  @LimiteTexto(100)
  modelo?: string;

  @ApiPropertyOptional({ example: 'Revisao anual prevista para 2027.' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(3000)
  observacoes?: string;

  @ApiPropertyOptional({ example: '2022-03-10' })
  @IsOptional()
  @VazioComoNulo()
  @IsDataSomenteDia()
  dataAquisicao?: string;

  @ApiPropertyOptional({ example: 1200 })
  @IsOptional()
  @VazioComoNulo()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorAquisicao?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @VazioComoNulo()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fornecedorId?: number;
}
