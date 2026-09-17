import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFuncionarioDto {
  @ApiProperty({ example: 'Francisco Pereira' })
  @IsString()
  @IsNotEmpty()
  nomeCompleto: string;

  @ApiPropertyOptional({ example: 'Chico' })
  @IsOptional()
  @IsString()
  apelido?: string;

  @ApiProperty({ example: '123.456.789-00' })
  @IsString()
  @IsNotEmpty()
  cpf: string;

  @ApiProperty({ example: '1985-03-15' })
  @IsDateString()
  dataNascimento: string;

  @ApiProperty({ example: 'Masculino' })
  @IsString()
  @IsNotEmpty()
  sexo: string;

  @ApiProperty({ example: '(69) 99612-4387' })
  @IsString()
  @IsNotEmpty()
  celular: string;

  @ApiProperty({ example: '76900-000' })
  @IsString()
  @IsNotEmpty()
  cep: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @IsString()
  @IsNotEmpty()
  cidade: string;

  @ApiProperty({ example: 'RO' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiProperty({ example: 'Av. Capitao Silvio' })
  @IsString()
  @IsNotEmpty()
  rua: string;

  @ApiProperty({ example: '1200' })
  @IsString()
  @IsNotEmpty()
  numero: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  @IsNotEmpty()
  bairro: string;

  @ApiPropertyOptional({ example: 'Apartamento, bloco, etc.' })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @IsNotEmpty()
  funcao: string;

  @ApiProperty({ example: 'Gestao' })
  @IsString()
  @IsNotEmpty()
  setorAtuacao: string;

  @ApiProperty({ example: 4500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salario: number;

  @ApiProperty({ example: 'CLT' })
  @IsString()
  @IsNotEmpty()
  tipoContrato: string;

  @ApiProperty({ example: '2018-03-01' })
  @IsDateString()
  dataContratacao: string;

  @ApiProperty({ example: '(69) 99999-0000' })
  @IsString()
  @IsNotEmpty()
  contatoEmergencia: string;

  @ApiProperty({ example: 'Maria Pereira' })
  @IsString()
  @IsNotEmpty()
  nomeContatoEmergencia: string;

  @ApiProperty({ example: 'Conjuge' })
  @IsString()
  @IsNotEmpty()
  grauVinculo: string;
}
