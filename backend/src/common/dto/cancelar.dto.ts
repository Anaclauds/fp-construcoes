import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AparaTexto } from '../validators/texto.transformer';
export class CancelarDto {
  @ApiProperty({ example: 'Lancamento feito incorretamente' })
  @AparaTexto()
  @IsString()
  @Length(3, 500)
  motivo: string;
}
