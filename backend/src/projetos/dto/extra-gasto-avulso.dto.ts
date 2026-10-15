import { Max as LimiteNumero } from 'class-validator';
import { AparaTexto } from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtraGastoAvulsoDto {
  @ApiProperty({ example: 'Aluguel de betoneira' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @AparaTexto()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @LimiteTexto(1000)
  descricao: string;

  @ApiProperty({ example: 180.5 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  @LimiteNumero(9999999999.99)
  valor: number;
}
