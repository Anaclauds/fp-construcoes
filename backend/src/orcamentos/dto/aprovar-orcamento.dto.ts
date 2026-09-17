import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
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
  @IsDateString({ strict: true })
  previsaoInicio: string;

  @ApiProperty({ example: '2026-12-15' })
  @IsDateString({ strict: true })
  previsaoConclusao: string;

  @ApiProperty({ example: '76920-000' })
  @IsString()
  @IsNotEmpty()
  cepObra: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cidadeObra: string;

  @ApiProperty({ example: 'RO' })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  estadoObra: string;

  @ApiProperty({ example: 'Avenida Daniel Comboni' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  ruaObra: string;

  @ApiProperty({ example: '100' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numeroObra: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bairroObra: string;

  @ApiPropertyOptional({ example: 'Fundos' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  complementoObra?: string;
}
