import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatusProjeto } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateStatusProjetoDto {
  @ApiProperty({
    enum: [StatusProjeto.CONCLUIDO, StatusProjeto.CANCELADO],
    example: StatusProjeto.CONCLUIDO,
  })
  @IsEnum(StatusProjeto)
  status: StatusProjeto;

  @ApiPropertyOptional({ example: '2026-10-14' })
  @IsOptional()
  @IsDataSomenteDia()
  dataConclusao?: string;
}
