import { IsIn, IsOptional } from 'class-validator';
export class OpcoesFuncionariosQueryDto {
  @IsOptional()
  @IsIn(['ATIVO', 'INATIVO', 'TODOS'])
  status?: 'ATIVO' | 'INATIVO' | 'TODOS';
}
