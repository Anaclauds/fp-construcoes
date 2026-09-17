import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'senhaAtual123' })
  @IsString()
  @MinLength(6)
  senhaAtual: string;

  @ApiProperty({ example: 'novaSenha123' })
  @IsString()
  @MinLength(6)
  novaSenha: string;

  @ApiProperty({ example: 'novaSenha123' })
  @IsString()
  @MinLength(6)
  confirmarNovaSenha: string;
}
