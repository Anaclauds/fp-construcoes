import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrcamentosController } from './orcamentos.controller';
import { OrcamentosService } from './orcamentos.service';

@Module({
  imports: [AuthModule],
  controllers: [OrcamentosController],
  providers: [OrcamentosService],
  exports: [OrcamentosService],
})
export class OrcamentosModule {}
