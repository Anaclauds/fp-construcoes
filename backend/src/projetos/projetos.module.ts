import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CobrancasModule } from '../cobrancas/cobrancas.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';

@Module({
  imports: [AuthModule, CobrancasModule, EstoqueModule, FinanceiroModule],
  controllers: [ProjetosController],
  providers: [ProjetosService],
  exports: [ProjetosService],
})
export class ProjetosModule {}
