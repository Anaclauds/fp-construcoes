import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CobrancasService } from './cobrancas.service';
import { CreateCobrancaDto } from './dto/create-cobranca.dto';
import { ListCobrancasQueryDto } from './dto/list-cobrancas-query.dto';
import { RegistrarRecebimentoDto } from './dto/registrar-recebimento.dto';

@ApiTags('Cobrancas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cobrancas')
export class CobrancasController {
  constructor(private readonly cobrancasService: CobrancasService) {}

  @Post()
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Gera uma cobranca e suas parcelas para um projeto',
  })
  create(@Body() dto: CreateCobrancaDto) {
    return this.cobrancasService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista cobrancas agrupadas por projeto' })
  findAll(@Query() query: ListCobrancasQueryDto) {
    return this.cobrancasService.findAll(query);
  }

  @Get('relatorios')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Gera o relatorio filtrado de cobrancas' })
  relatorio(@Query() query: ListCobrancasQueryDto) {
    return this.cobrancasService.relatorio(query);
  }

  @Get('relatorios/exportar/pdf')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Exporta o relatorio de cobrancas em PDF' })
  async exportarPdf(@Query() query: ListCobrancasQueryDto) {
    const arquivo = await this.cobrancasService.exportarRelatorioPdf(query);
    return new StreamableFile(arquivo, {
      type: 'application/pdf',
      disposition: 'attachment; filename="relatorio-cobrancas.pdf"',
    });
  }

  @Get('relatorios/exportar/excel')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Exporta o relatorio de cobrancas em Excel' })
  async exportarExcel(@Query() query: ListCobrancasQueryDto) {
    const arquivo = await this.cobrancasService.exportarRelatorioExcel(query);
    return new StreamableFile(arquivo, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="relatorio-cobrancas.xlsx"',
    });
  }

  @Get('projetos/:projetoId')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Exibe todas as cobrancas de um projeto' })
  findProjeto(@Param('projetoId', ParseIntPipe) projetoId: number) {
    return this.cobrancasService.findProjeto(projetoId);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Exibe parcelas e recebimentos de uma cobranca' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cobrancasService.findOne(id);
  }

  @Post(':id/recebimentos')
  @RequirePermission({ modulo: 'COBRANCAS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Registra um recebimento e atualiza parcela, cobranca e caixa',
  })
  registrarRecebimento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RegistrarRecebimentoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.cobrancasService.registrarRecebimento(id, dto, user.sub);
  }
}
