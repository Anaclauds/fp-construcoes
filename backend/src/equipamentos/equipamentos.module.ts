import { Module } from '@nestjs/common';
import { EquipamentosController } from './equipamentos.controller';
import { EquipamentosService } from './equipamentos.service';

@Module({
  controllers: [EquipamentosController],
  providers: [EquipamentosService],
  exports: [EquipamentosService],
})
export class EquipamentosModule {}
