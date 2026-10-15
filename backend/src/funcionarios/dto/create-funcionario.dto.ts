import { IsCadastro } from '../../common/validators/cadastro.validator';
import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFuncionarioDto {
  @ApiProperty({ example: 'Francisco Pereira' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(180)
  nomeCompleto: string;

  @ApiPropertyOptional({ example: 'Chico' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(80)
  apelido?: string;

  @ApiProperty({ example: '123.456.789-00' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @IsCadastro('cpf')
  cpf: string;

  @ApiProperty({ example: '1985-03-15' })
  @IsDataSomenteDia()
  dataNascimento: string;

  @ApiProperty({ example: 'Masculino' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(30)
  sexo: string;

  @ApiProperty({ example: '(69) 99612-4387' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @IsCadastro('telefone')
  celular: string;

  @ApiProperty({ example: '76900-000' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @IsCadastro('cep')
  cep: string;

  @ApiProperty({ example: 'Ouro Preto do Oeste' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(100)
  cidade: string;

  @ApiProperty({ example: 'RO' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(2)
  @IsCadastro('uf')
  estado: string;

  @ApiProperty({ example: 'Av. Capitao Silvio' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(150)
  rua: string;

  @ApiProperty({ example: '1200' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(20)
  numero: string;

  @ApiProperty({ example: 'Centro' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(100)
  bairro: string;

  @ApiPropertyOptional({ example: 'Apartamento, bloco, etc.' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(150)
  complemento?: string;

  @ApiProperty({ example: 'Administrador' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(100)
  funcao: string;

  @ApiProperty({ example: 'Gestao' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(100)
  setorAtuacao: string;

  @ApiProperty({ example: 4500 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @LimiteNumero(9999999999.99)
  salario: number;

  @ApiProperty({ example: 'CLT' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(40)
  tipoContrato: string;

  @ApiProperty({ example: '2018-03-01' })
  @IsDataSomenteDia()
  dataContratacao: string;

  @ApiProperty({ example: '(69) 99999-0000' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @IsCadastro('telefone')
  contatoEmergencia: string;

  @ApiProperty({ example: 'Maria Pereira' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(150)
  nomeContatoEmergencia: string;

  @ApiProperty({ example: 'Conjuge' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @LimiteTexto(60)
  grauVinculo: string;
}
