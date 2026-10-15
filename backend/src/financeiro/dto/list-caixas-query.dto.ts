import { PickType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { StatusCaixa } from '@prisma/client';
import { ListUsuariosQueryDto } from '../../usuarios/dto/list-usuarios-query.dto';

export class ListCaixasQueryDto extends PickType(ListUsuariosQueryDto, [
  'page',
  'limit',
] as const) {
  @ApiPropertyOptional({ enum: StatusCaixa })
  @IsOptional()
  @IsEnum(StatusCaixa)
  status?: StatusCaixa;
}
