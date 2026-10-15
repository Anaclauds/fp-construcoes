import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
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
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @LimiteTexto(180)
  nome: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @LimiteNumero(999999999.999)
  quantidade: number;

  @ApiProperty({ example: 'SC' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @LimiteTexto(50)
  unidadeMedida: string;
}
