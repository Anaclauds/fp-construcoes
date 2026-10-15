import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { CondicaoCobrancaProjetoDto } from './condicao-cobranca-projeto.dto';

export class SimularCobrancaDto extends CondicaoCobrancaProjetoDto {
  @ApiPropertyOptional({
    description:
      'Valor bruto da etapa. Omitir para simular o inicio com deducao das entradas previas.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(9999999999.99)
  valorCobrado?: number;
}
