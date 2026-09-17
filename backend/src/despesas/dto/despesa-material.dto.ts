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
  quantidade: number;

  @ApiProperty({ example: 'UN' })
  @IsString()
  @MaxLength(50)
  unidadeMedida: string;

  @ApiProperty({ example: 32.9 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorUnitario: number;
}
