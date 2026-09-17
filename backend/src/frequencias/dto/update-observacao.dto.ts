import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateObservacaoDto {
  @ApiProperty({ example: 'Atestado medico apresentado.' })
  @IsString()
  observacao: string;
}
