import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModalidadeCobranca, TipoOrcamento } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { OrcamentoMaterialDto } from './orcamento-material.dto';
import { OrcamentoServicoDto } from './orcamento-servico.dto';

export class CreateOrcamentoDto {
  @ApiProperty({ example: 'Instalacao de Rufos e Calhas' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  titulo: string;

  @ApiProperty({ enum: TipoOrcamento, example: TipoOrcamento.CALHAS })
  @IsEnum(TipoOrcamento)
  tipo: TipoOrcamento;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId: number;

  @ApiProperty({ example: 30, description: 'Prazo estimado em dias' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prazoEstimadoDias: number;

  @ApiPropertyOptional({ example: 'Condicoes e detalhes do orcamento.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  observacoes?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  desconto?: number;

  @ApiPropertyOptional({
    enum: ModalidadeCobranca,
    example: ModalidadeCobranca.A_VISTA,
    default: ModalidadeCobranca.A_VISTA,
  })
  @IsOptional()
  @IsEnum(ModalidadeCobranca)
  modalidadePagamento?: ModalidadeCobranca;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroParcelas?: number;

  @ApiPropertyOptional({ example: '2026-09-10' })
  @IsOptional()
  @IsDateString()
  dataPrimeiroVencimento?: string;

  @ApiPropertyOptional({ type: [OrcamentoMaterialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrcamentoMaterialDto)
  materiais?: OrcamentoMaterialDto[];

  @ApiPropertyOptional({ type: [OrcamentoServicoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrcamentoServicoDto)
  servicos?: OrcamentoServicoDto[];
}
