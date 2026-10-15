import { Max as LimiteNumero } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class ExtraMaterialDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materialId: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @LimiteNumero(999999999.999)
  quantidade: number;

  @ApiPropertyOptional({ example: 42.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @LimiteNumero(9999999999.99)
  custoUnitarioEstimado?: number;
}
