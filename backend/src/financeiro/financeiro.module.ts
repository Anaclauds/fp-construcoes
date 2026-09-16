import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FinanceiroController } from './financeiro.controller';
import { FinanceiroService } from './financeiro.service';

@Module({
  imports: [AuthModule],
  controllers: [FinanceiroController],
  providers: [FinanceiroService],
  exports: [FinanceiroService],
})
export class FinanceiroModule {}
