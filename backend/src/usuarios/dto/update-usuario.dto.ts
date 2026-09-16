import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StatusCadastro } from '@prisma/client';
import { Type } from 'class-transformer';
import { PermissaoUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'novaSenha123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;

  @ApiPropertyOptional({ example: 'novaSenha123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  confirmarSenha?: string;

  @ApiPropertyOptional({ enum: StatusCadastro, example: StatusCadastro.ATIVO })
  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;

  @ApiPropertyOptional({ type: [PermissaoUsuarioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissaoUsuarioDto)
  permissoes?: PermissaoUsuarioDto[];
}
