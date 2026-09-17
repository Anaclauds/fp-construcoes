import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Matches, Min } from 'class-validator';

export class AbrirCaixaDto {
  @ApiProperty({
    example: '2026-08',
    description: 'Competencia no formato AAAA-MM',
  })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  competencia: string;

  @ApiProperty({ example: 1500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorInicial: number;
}
