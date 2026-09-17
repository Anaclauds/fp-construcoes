import { Module } from '@nestjs/common';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';

@Module({
  controllers: [FornecedoresController],
  providers: [FornecedoresService],
  exports: [FornecedoresService],
})
export class FornecedoresModule {}
