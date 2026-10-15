import {
  AparaTexto,
  VazioComoNulo,
} from '../../common/validators/texto.transformer';
import { MaxLength as LimiteTexto } from 'class-validator';
import { IsDataSomenteDia } from '../../common/validators/data-somente-dia.validator';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProjetoDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  responsavelId?: number;
  @IsOptional()
  @VazioComoNulo()
  @IsDataSomenteDia()
  previsaoInicio?: string | null;
  @IsOptional()
  @VazioComoNulo()
  @IsDataSomenteDia()
  previsaoConclusao?: string | null;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @Length(8, 8)
  cepObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(100)
  cidadeObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @Length(2, 2)
  estadoObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(150)
  ruaObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(20)
  numeroObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(100)
  bairroObra?: string;
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(150)
  complementoObra?: string | null;
}

export class UpdateEtapaProjetoDto {
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(1000)
  @LimiteTexto(1000)
  descricao?: string;
  @IsOptional()
  @IsDataSomenteDia()
  dataRegistro?: string;
}

export class UpdateExtraProjetoDto {
  @IsOptional()
  @AparaTexto()
  @IsString()
  @MaxLength(1000)
  @LimiteTexto(3000)
  descricaoJustificativa?: string;
  @IsOptional()
  @IsDataSomenteDia()
  dataRegistro?: string;
}
