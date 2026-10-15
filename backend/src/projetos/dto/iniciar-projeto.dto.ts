import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CondicaoCobrancaProjetoDto } from './condicao-cobranca-projeto.dto';

export class IniciarProjetoDto extends CondicaoCobrancaProjetoDto {
  @ApiPropertyOptional({
    example: '2026-09-28',
    description: 'Data efetiva de inicio. Quando omitida, usa a data atual.',
  })
  @IsOptional()
  @IsDataSomenteDia()
  dataInicio?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @IsDataSomenteDia()
  previsaoConclusao?: string;
}
