import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FormaPagamento,
  ModalidadeCobranca,
  TipoCobranca,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ParcelaManualDto } from './parcela-manual.dto';

export class CreateCobrancaDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projetoId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  etapaId?: number;

  @ApiProperty({ enum: TipoCobranca, example: TipoCobranca.MEDICAO })
  @IsEnum(TipoCobranca)
  tipo: TipoCobranca;

  @ApiProperty({
    enum: ModalidadeCobranca,
    example: ModalidadeCobranca.PARCELADO_MANUAL,
  })
  @IsEnum(ModalidadeCobranca)
  modalidade: ModalidadeCobranca;

  @ApiPropertyOptional({ enum: FormaPagamento, example: FormaPagamento.PIX })
  @IsOptional()
  @IsEnum(FormaPagamento)
  formaPagamento?: FormaPagamento;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  percentualReferencia?: number;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  percentualDesconto?: number;

  @ApiPropertyOptional({ example: 3.5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(99.99)
  percentualAcrescimo?: number;

  @ApiProperty({
    example: 12000,
    description:
      'Subtotal antes de desconto e acrescimo. O valor final e calculado pela API.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorBase: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroParcelas?: number;

  @ApiPropertyOptional({ example: '2026-09-10' })
  @IsOptional()
  @IsDateString()
  primeiroVencimento?: string;

  @ApiPropertyOptional({ type: [ParcelaManualDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcelaManualDto)
  parcelas?: ParcelaManualDto[];
}
