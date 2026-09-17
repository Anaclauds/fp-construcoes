import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class ParcelaManualDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numero: number;

  @ApiProperty({ example: '2026-09-10' })
  @IsDateString()
  vencimento: string;

  @ApiProperty({ example: 6000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valor: number;
}
