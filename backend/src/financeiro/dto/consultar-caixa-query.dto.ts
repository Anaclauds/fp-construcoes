import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class ConsultarCaixaQueryDto {
  @ApiPropertyOptional({
    example: '2026-08',
    description: 'Competencia no formato AAAA-MM; o mes atual e o padrao',
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  competencia?: string;
}
