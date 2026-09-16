import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ExtraMaterialDto } from './extra-material.dto';
import { ExtraServicoDto } from './extra-servico.dto';

export class CreateExtraProjetoDto {
  @ApiProperty({
    example: 'Reforco estrutural solicitado apos alteracao do escopo',
  })
  @IsString()
  @MaxLength(3000)
  descricaoJustificativa: string;

  @ApiPropertyOptional({ example: '2026-10-20' })
  @IsOptional()
  @IsDateString()
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
}
