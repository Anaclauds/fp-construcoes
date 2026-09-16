import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CondicaoCobrancaProjetoDto } from './condicao-cobranca-projeto.dto';

export class IniciarProjetoDto extends CondicaoCobrancaProjetoDto {
  @ApiPropertyOptional({
    example: '2026-09-28',
    description: 'Data efetiva de inicio. Quando omitida, usa a data atual.',
  })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDateString()
  previsaoConclusao?: string;
}
