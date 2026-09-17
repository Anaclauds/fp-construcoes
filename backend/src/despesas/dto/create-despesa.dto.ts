import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoriaDespesa, TipoDespesa } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { DespesaMaterialDto } from './despesa-material.dto';

export class CreateDespesaDto {
  @ApiProperty({ enum: TipoDespesa, example: TipoDespesa.COMPRA_MATERIAL })
  @IsEnum(TipoDespesa)
  tipo: TipoDespesa;

  @ApiPropertyOptional({
    enum: CategoriaDespesa,
    example: CategoriaDespesa.COMPRA_MATERIAL,
  })
  @IsOptional()
  @IsEnum(CategoriaDespesa)
  categoria?: CategoriaDespesa;

  @ApiProperty({ example: '2026-08-08' })
  @IsDateString({ strict: true })
  data: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Obrigatorio para compra de material',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fornecedorId?: number;

  @ApiProperty({ example: 'Compra de cimento para reposicao do estoque.' })
  @IsString()
  @IsNotEmpty()
  descricao: string;

  @ApiPropertyOptional({
    example: 350,
    description:
      'Obrigatorio para despesa diversa; compras sao totalizadas pelos itens',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorTotal?: number;

  @ApiPropertyOptional({
    type: [DespesaMaterialDto],
    description: 'Obrigatorio para compra de material',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((item: DespesaMaterialDto) => item.materialId)
  @ValidateNested({ each: true })
  @Type(() => DespesaMaterialDto)
  materiais?: DespesaMaterialDto[];
}
