import { PartialType } from '@nestjs/swagger';
import { CreateFornecedorDto } from './create-fornecedor.dto';

export class UpdateFornecedorDto extends PartialType(CreateFornecedorDto) {}
