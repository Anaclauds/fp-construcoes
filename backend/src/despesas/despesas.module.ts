import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { DespesasController } from './despesas.controller';
import { DespesasService } from './despesas.service';

@Module({
  imports: [AuthModule, FinanceiroModule],
  controllers: [DespesasController],
  providers: [DespesasService],
})
export class DespesasModule {}
