import { ApiProperty } from '@nestjs/swagger';

export class EnderecoCepDto {
  @ApiProperty({ example: '76900-058' })
  cep: string;

  @ApiProperty({ example: 'Avenida Marechal Rondon' })
  logradouro: string;

  @ApiProperty({ example: 'Centro' })
  bairro: string;

  @ApiProperty({ example: 'Ji-Paraná' })
  cidade: string;

  @ApiProperty({ example: 'RO' })
  estado: string;
}
