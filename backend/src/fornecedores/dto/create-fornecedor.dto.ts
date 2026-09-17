import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateFornecedorDto {
  @ApiProperty({ example: 'Aco Premium Distribuidora Ltda' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  razaoSocial: string;

  @ApiProperty({ example: 'AcoPremium' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nomeFantasia: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  cnpj: string;

  @ApiProperty({ example: '(69) 99123-4567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contato: string;

  @ApiProperty({ example: 'Carlos Henrique' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  responsavel: string;

  @ApiProperty({ example: 'Gerente Comercial' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cargoResponsavel: string;

  @ApiProperty({ example: '76916-000' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(9)
  cep: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  cidade: string;

  @ApiProperty({ example: 'RO' })
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  estado: string;

  @ApiProperty({ example: 'Avenida Industrial' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  rua: string;

  @ApiProperty({ example: '450' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  numero: string;

  @ApiProperty({ example: 'Setor Industrial' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  bairro: string;

  @ApiPropertyOptional({ example: 'Galpao 2' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  complemento?: string;
}
