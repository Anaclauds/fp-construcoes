import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExtraMaterialDto } from './extra-material.dto';
import { ExtraServicoDto } from './extra-servico.dto';
import { ExtraGastoAvulsoDto } from './extra-gasto-avulso.dto';

export class CreateExtraProjetoDto {
  @ApiProperty({
    example: 'Reforco estrutural solicitado apos alteracao do escopo',
  })
  @AparaTexto()
  @IsString()
  @MaxLength(3000)
  @LimiteTexto(3000)
  descricaoJustificativa: string;

  @ApiPropertyOptional({ example: '2026-10-20' })
  @IsOptional()
  @IsDataSomenteDia()
  dataRegistro?: string;

  @ApiPropertyOptional({ type: [ExtraMaterialDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraMaterialDto)
  materiais?: ExtraMaterialDto[];

  @ApiPropertyOptional({ type: [ExtraServicoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraServicoDto)
  servicos?: ExtraServicoDto[];

  @ApiPropertyOptional({ type: [ExtraGastoAvulsoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtraGastoAvulsoDto)
  gastosAvulsos?: ExtraGastoAvulsoDto[];
}
