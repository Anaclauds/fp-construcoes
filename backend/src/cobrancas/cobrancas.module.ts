import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CobrancasController } from './cobrancas.controller';
import { CobrancasService } from './cobrancas.service';

@Module({
  imports: [AuthModule],
  controllers: [CobrancasController],
  providers: [CobrancasService],
  exports: [CobrancasService],
})
export class CobrancasModule {}
