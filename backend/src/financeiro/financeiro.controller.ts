import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { AbrirCaixaDto } from './dto/abrir-caixa.dto';
import { ConsultarCaixaQueryDto } from './dto/consultar-caixa-query.dto';
import { RelatorioRecebimentosQueryDto } from './dto/relatorio-recebimentos-query.dto';
import { FinanceiroService } from './financeiro.service';

@ApiTags('Financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Post('caixa/abrir')
  @RequirePermission({ modulo: 'CAIXA', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Abre o caixa mensal ou informa seu saldo inicial' })
  abrirCaixa(@Body() dto: AbrirCaixaDto) {
    return this.financeiroService.abrirCaixa(dto);
  }

  @Get('caixa')
  @RequirePermission({ modulo: 'CAIXA', acao: 'visualizar' })
  @ApiOperation({ summary: 'Exibe resumo, entradas e saidas do caixa mensal' })
  consultarCaixa(@Query() query: ConsultarCaixaQueryDto) {
    return this.financeiroService.consultarCaixa(query.competencia);
  }

  @Patch('caixa/:id/fechar')
  @RequirePermission({ modulo: 'CAIXA', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Fecha o caixa e impede novos lancamentos na competencia',
  })
  fecharCaixa(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.financeiroService.fecharCaixa(id, user.sub);
  }

  @Get('relatorios/recebimentos')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({
    summary: 'Emite relatorio de recebimentos por periodo e filtros',
  })
  relatorioRecebimentos(@Query() query: RelatorioRecebimentosQueryDto) {
    return this.financeiroService.relatorioRecebimentos(query);
  }
}
