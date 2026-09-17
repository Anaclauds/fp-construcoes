import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class OrcamentoServicoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  servicoId: number;

  @ApiPropertyOptional({ example: 'Inclui mao de obra e ferramental' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricaoAdicional?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;

  @ApiProperty({ example: 4234 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorUnitario: number;
}
