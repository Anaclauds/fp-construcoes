import { Max as LimiteNumero } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormaPagamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarRecebimentoDto {
  @ApiProperty({ example: 1, description: 'Parcela referente ao recebimento' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parcelaId: number;

  @ApiProperty({ example: 6000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @LimiteNumero(9999999999.99)
  valor: number;

  @ApiProperty({ example: '2026-09-10' })
  @IsDataSomenteDia()
  dataRecebimento: string;

  @ApiProperty({ enum: FormaPagamento, example: FormaPagamento.PIX })
  @IsEnum(FormaPagamento)
  formaPagamento: FormaPagamento;

  @ApiPropertyOptional({ example: 'Pagamento confirmado pelo cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
