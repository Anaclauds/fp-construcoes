import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusFrequencia } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class RegistroFrequenciaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  funcionarioId: number;

  @ApiProperty({
    enum: StatusFrequencia,
    example: StatusFrequencia.PRESENTE,
  })
  @IsEnum(StatusFrequencia)
  status: StatusFrequencia;

  @ApiPropertyOptional({ example: 'Saiu as 11h para consulta medica.' })
  @IsOptional()
  @IsString()
  observacao?: string;
}

export class SaveFrequenciaDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  data: string;

  @ApiProperty({ type: [RegistroFrequenciaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistroFrequenciaDto)
  registros: RegistroFrequenciaDto[];
}
