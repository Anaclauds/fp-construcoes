import { IsCadastro } from '../../common/validators/cadastro.validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoCliente } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClienteDto {
  @ApiPropertyOptional({ example: 'Joao Henrique de Souza' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(180)
  nome?: string;

  @ApiProperty({ example: '(69) 98127-3645' })
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @IsCadastro('telefone')
  telefone: string;

  @ApiPropertyOptional({
    example: 'Ouro Preto do Oeste',
    description: 'Pode ser preenchida automaticamente a partir do CEP.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(100)
  cidade?: string;

  @ApiPropertyOptional({
    example: 'RO',
    description: 'Pode ser preenchido automaticamente a partir do CEP.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(2)
  @IsCadastro('uf')
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
  @AparaTexto()
  @IsString()
  @IsCadastro('documento')
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Joao' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(80)
  apelido?: string;

  @ApiPropertyOptional({ example: '1985-03-15' })
  @IsOptional()
  @IsDataSomenteDia()
  dataNascimento?: string;

  @ApiPropertyOptional({ example: 'Masculino' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(30)
  sexo?: string;

  @ApiPropertyOptional({ example: 'VerdeVale Comercio Ltda' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(180)
  razaoSocial?: string;

  @ApiPropertyOptional({ example: 'VerdeVale' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(150)
  nomeFantasia?: string;

  @ApiPropertyOptional({
    example: 'Maria Souza',
    description: 'Contato responsável na empresa cliente. Utilizado em PJ.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(150)
  responsavel?: string;

  @ApiPropertyOptional({
    example: 'Gerente de Compras',
    description: 'Cargo do contato responsável. Utilizado em PJ.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(100)
  cargoResponsavel?: string;

  @ApiPropertyOptional({
    example: '76900-058',
    description:
      'Quando o endereço estiver incompleto, a API consulta o CEP e preenche logradouro, bairro, cidade e estado.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @IsCadastro('cep')
  cep?: string;

  @ApiPropertyOptional({
    example: 'Avenida Marechal Rondon',
    description: 'Pode ser preenchida automaticamente a partir do CEP.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(150)
  rua?: string;

  @ApiPropertyOptional({ example: '142' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(20)
  numero?: string;

  @ApiPropertyOptional({
    example: 'Centro',
    description: 'Pode ser preenchido automaticamente a partir do CEP.',
  })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(100)
  bairro?: string;

  @ApiPropertyOptional({ example: 'Apartamento, bloco, etc.' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  @LimiteTexto(150)
  complemento?: string;
}
