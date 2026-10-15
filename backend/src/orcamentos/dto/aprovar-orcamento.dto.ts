import { AparaTexto } from '../../common/validators/texto.transformer';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class AprovarOrcamentoDto {
  @ApiProperty({
    example: 1,
    description: 'Funcionario responsavel pelo projeto',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsavelId: number;

  @ApiProperty({ example: '2026-10-01' })
  @IsDataSomenteDia()
  previsaoInicio: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDataSomenteDia()
  previsaoConclusao: string;

  @ApiProperty({ example: '76920-000' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  cepObra: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cidadeObra: string;

  @ApiProperty({ example: 'RO' })
  @AparaTexto()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  estadoObra: string;

  @ApiProperty({ example: 'Avenida Daniel Comboni' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruaObra: string;

  @ApiProperty({ example: '100' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroObra: string;

  @ApiProperty({ example: 'Centro' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bairroObra: string;

  @ApiPropertyOptional({ example: 'Fundos' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(150)
  complementoObra?: string;
}
