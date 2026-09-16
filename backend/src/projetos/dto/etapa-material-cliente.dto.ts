import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class EtapaMaterialClienteDto {
  @ApiProperty({ example: 'Cimento fornecido pelo cliente' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  nome: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;

  @ApiProperty({ example: 'SC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unidadeMedida: string;
}
