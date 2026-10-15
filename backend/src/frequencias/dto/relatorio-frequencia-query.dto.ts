import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusFrequencia } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class RelatorioFrequenciaQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  funcionarioId: number;

  @ApiProperty({ example: '2026-08-01' })
  @IsDataSomenteDia()
  dataInicial: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDataSomenteDia()
  dataFinal: string;

  @ApiPropertyOptional({
    enum: StatusFrequencia,
    example: StatusFrequencia.PRESENTE,
  })
  @IsOptional()
  @IsIn([...Object.values(StatusFrequencia), 'NAO_REGISTRADO'])
  status?: StatusFrequencia | 'NAO_REGISTRADO';

  @ApiPropertyOptional({ example: 'DETALHADO_POR_DIA' })
  @IsOptional()
  @IsString()
  tipoRelatorio?: string;
}
