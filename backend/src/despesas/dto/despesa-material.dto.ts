import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class DespesaMaterialDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materialId: number;

  @ApiProperty({ example: 20.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @LimiteNumero(999999999.999)
  quantidade: number;

  @ApiProperty({ example: 'UN' })
  @AparaTexto()
  @IsString()
  @MaxLength(50)
  @LimiteTexto(50)
  unidadeMedida: string;

  @ApiProperty({ example: 32.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @LimiteNumero(9999999999.99)
  valorUnitario: number;
}
