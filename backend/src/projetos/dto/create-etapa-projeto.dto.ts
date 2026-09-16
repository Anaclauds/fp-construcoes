import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CondicaoCobrancaProjetoDto } from './condicao-cobranca-projeto.dto';
import { EtapaServicoDto } from './etapa-servico.dto';
import { EtapaMaterialClienteDto } from './etapa-material-cliente.dto';

export class CreateEtapaProjetoDto extends CondicaoCobrancaProjetoDto {
  @ApiProperty({
    example: 'Instalacao dos revestimentos e acabamento da primeira area',
  })
  @IsString()
  @MaxLength(3000)
  descricao: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsOptional()
  @IsDateString()
  dataRegistro?: string;

  @ApiProperty({
    example: 3500,
    description: 'Valor da medicao que sera cobrado nesta etapa',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  valorCobrado: number;

  @ApiProperty({ type: [EtapaServicoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EtapaServicoDto)
  servicos: EtapaServicoDto[];

  @ApiPropertyOptional({ type: [EtapaMaterialClienteDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaMaterialClienteDto)
  materiaisCliente?: EtapaMaterialClienteDto[];
}
