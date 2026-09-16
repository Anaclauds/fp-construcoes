import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClienteDto {
  @ApiPropertyOptional({ example: 'Joao Henrique de Souza' })
  @IsOptional()
  @IsString()
  nome?: string;

  @ApiProperty({ example: '(69) 98127-3645' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiPropertyOptional({
    example: 'Ouro Preto do Oeste',
    description: 'Pode ser preenchida automaticamente a partir do CEP.',
  })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({
    example: 'RO',
    description: 'Pode ser preenchido automaticamente a partir do CEP.',
  })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional({
    enum: TipoCliente,
    example: TipoCliente.PF,
    description: 'PF para pessoa física ou PJ para pessoa jurídica.',
  })
  @IsOptional()
  @IsEnum(TipoCliente)
  tipo?: TipoCliente;

  @ApiPropertyOptional({ example: '409.350.272-20' })
  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Joao' })
  @IsOptional()
  @IsString()
  apelido?: string;

  @ApiPropertyOptional({ example: '1985-03-15' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional({ example: 'Masculino' })
  @IsOptional()
  @IsString()
  sexo?: string;

  @ApiPropertyOptional({ example: 'VerdeVale Comercio Ltda' })
  @IsOptional()
  @IsString()
  razaoSocial?: string;

  @ApiPropertyOptional({ example: 'VerdeVale' })
  @IsOptional()
  @IsString()
  nomeFantasia?: string;

  @ApiPropertyOptional({
    example: 'Maria Souza',
    description: 'Contato responsável na empresa cliente. Utilizado em PJ.',
  })
  @IsOptional()
  @IsString()
  responsavel?: string;

  @ApiPropertyOptional({
    example: 'Gerente de Compras',
    description: 'Cargo do contato responsável. Utilizado em PJ.',
  })
  @IsOptional()
  @IsString()
  cargoResponsavel?: string;

  @ApiPropertyOptional({
    example: '76900-058',
    description:
      'Quando o endereço estiver incompleto, a API consulta o CEP e preenche logradouro, bairro, cidade e estado.',
  })
  @IsOptional()
  @IsString()
  cep?: string;

  @ApiPropertyOptional({
    example: 'Avenida Marechal Rondon',
    description: 'Pode ser preenchida automaticamente a partir do CEP.',
  })
  @IsOptional()
  @IsString()
  rua?: string;

  @ApiPropertyOptional({ example: '142' })
  @IsOptional()
  @IsString()
  numero?: string;

  @ApiPropertyOptional({
    example: 'Centro',
    description: 'Pode ser preenchido automaticamente a partir do CEP.',
  })
  @IsOptional()
  @IsString()
  bairro?: string;

  @ApiPropertyOptional({ example: 'Apartamento, bloco, etc.' })
  @IsOptional()
  @IsString()
  complemento?: string;
}
