import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '74216094600' })
  @IsString()
  @IsNotEmpty()
  login: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}
