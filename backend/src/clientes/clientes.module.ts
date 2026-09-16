import { Module } from '@nestjs/common';
import { EnderecosModule } from '../enderecos/enderecos.module';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [EnderecosModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
