import { ApiProperty } from '@nestjs/swagger';
import { TipoMovimentacaoEstoque } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

const TIPOS_AJUSTE = [
  TipoMovimentacaoEstoque.AJUSTE_ENTRADA,
  TipoMovimentacaoEstoque.AJUSTE_SAIDA,
] as const;

export class AjustarEstoqueDto {
  @ApiProperty({ enum: TIPOS_AJUSTE, example: 'AJUSTE_SAIDA' })
  @IsIn(TIPOS_AJUSTE)
  tipo: TipoMovimentacaoEstoque;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantidade: number;

  @ApiProperty({ example: 'Correcao apos conferencia fisica do estoque.' })
  @IsString()
  @IsNotEmpty()
  justificativa: string;
}
