import { Module } from '@nestjs/common';
import { EnderecosController } from './enderecos.controller';
import { EnderecosService } from './enderecos.service';

@Module({
  controllers: [EnderecosController],
  providers: [EnderecosService],
  exports: [EnderecosService],
})
export class EnderecosModule {}
