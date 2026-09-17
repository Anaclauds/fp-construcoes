import { ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamento, ModalidadeCobranca } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class CondicaoCobrancaProjetoDto {
  @ApiPropertyOptional({
    enum: [ModalidadeCobranca.A_VISTA, ModalidadeCobranca.PARCELADO_AUTOMATICO],
    example: ModalidadeCobranca.A_VISTA,
    description: 'Use A_VISTA ou PARCELADO_AUTOMATICO nos fluxos dos layers.',
  })
  @IsOptional()
  @IsEnum(ModalidadeCobranca)
  modalidadeCobranca?: ModalidadeCobranca;

  @ApiPropertyOptional({ enum: FormaPagamento, example: FormaPagamento.PIX })
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  descontoPercentual?: number;

  @ApiPropertyOptional({ example: 3.5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  acrescimoPercentual?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  numeroParcelas?: number;

  @ApiPropertyOptional({ example: '2026-10-10' })
  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;
}
