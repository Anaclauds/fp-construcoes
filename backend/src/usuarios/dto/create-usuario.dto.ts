import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  ArrayUnique,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MODULOS_SISTEMA,
  type ModuloSistema,
} from '../../auth/permissions.constants';

export class PermissaoUsuarioDto {
  @ApiProperty({ enum: MODULOS_SISTEMA, example: 'GESTAO_USUARIOS' })
  @IsString()
  @IsNotEmpty()
  @IsIn(MODULOS_SISTEMA)
  modulo: ModuloSistema;

  @ApiProperty({ example: true })
  @IsBoolean()
  podeVisualizar: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  podeGerenciar: boolean;
}

export class CreateUsuarioDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  funcionarioId: number;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  senha: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  confirmarSenha: string;

  @ApiPropertyOptional({
    type: [PermissaoUsuarioDto],
    example: [
      {
        modulo: 'GESTAO_USUARIOS',
        podeVisualizar: true,
        podeGerenciar: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((permissao: PermissaoUsuarioDto) => permissao.modulo)
  @ValidateNested({ each: true })
  @Type(() => PermissaoUsuarioDto)
  permissoes?: PermissaoUsuarioDto[];
}
