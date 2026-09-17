import { Module } from '@nestjs/common';
import { ServicosController } from './servicos.controller';
import { ServicosService } from './servicos.service';

@Module({
  controllers: [ServicosController],
  providers: [ServicosService],
  exports: [ServicosService],
})
export class ServicosModule {}
