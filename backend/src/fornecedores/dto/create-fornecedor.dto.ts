import { IsCadastro } from '../../common/validators/cadastro.validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
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
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  @LimiteTexto(180)
  razaoSocial: string;

  @ApiProperty({ example: 'AcoPremium' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @LimiteTexto(150)
  nomeFantasia: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(18)
  @IsCadastro('cnpj')
  cnpj: string;

  @ApiProperty({ example: '(69) 99123-4567' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @IsCadastro('telefone')
  contato: string;

  @ApiProperty({ example: 'Carlos Henrique' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @LimiteTexto(150)
  responsavel: string;

  @ApiProperty({ example: 'Gerente Comercial' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @LimiteTexto(100)
  cargoResponsavel: string;

  @ApiProperty({ example: '76916-000' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(9)
  @IsCadastro('cep')
  cep: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @LimiteTexto(100)
  cidade: string;

  @ApiProperty({ example: 'RO' })
  @AparaTexto()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  @LimiteTexto(2)
  @IsCadastro('uf')
  estado: string;

  @ApiProperty({ example: 'Avenida Industrial' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @LimiteTexto(150)
  rua: string;

  @ApiProperty({ example: '450' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @LimiteTexto(20)
  numero: string;

  @ApiProperty({ example: 'Setor Industrial' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @LimiteTexto(100)
  bairro: string;

  @ApiPropertyOptional({ example: 'Galpao 2' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(150)
  @LimiteTexto(150)
  complemento?: string;
}
