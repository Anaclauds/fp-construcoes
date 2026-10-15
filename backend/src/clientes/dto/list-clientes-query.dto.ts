import { AparaTexto } from '../../common/validators/texto.transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusCadastro, TipoCliente } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListClientesQueryDto {
  @ApiPropertyOptional({ example: 'Joao' })
  @IsOptional()
  @AparaTexto()
  @IsString()
  busca?: string;

  @ApiPropertyOptional({ enum: TipoCliente, example: TipoCliente.PF })
  @IsOptional()
  @IsEnum(TipoCliente)
  tipo?: TipoCliente;

  @ApiPropertyOptional({ enum: StatusCadastro, example: StatusCadastro.ATIVO })
  @IsOptional()
  @IsEnum(StatusCadastro)
  status?: StatusCadastro;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  cadastroCompleto?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
