import { Module } from '@nestjs/common';
import { MateriaisModule } from '../materiais/materiais.module';
import { EstoqueController } from './estoque.controller';
import { EstoqueService } from './estoque.service';

@Module({
  imports: [MateriaisModule],
  controllers: [EstoqueController],
  providers: [EstoqueService],
  exports: [EstoqueService],
})
export class EstoqueModule {}
