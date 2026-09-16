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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AprovarOrcamentoDto } from './dto/aprovar-orcamento.dto';
import { CreateOrcamentoDto } from './dto/create-orcamento.dto';
import { ListOrcamentosQueryDto } from './dto/list-orcamentos-query.dto';
import { UpdateOrcamentoDto } from './dto/update-orcamento.dto';
import { UpdateStatusOrcamentoDto } from './dto/update-status-orcamento.dto';
import { OrcamentosService } from './orcamentos.service';

@ApiTags('Orcamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orcamentos')
export class OrcamentosController {
  constructor(private readonly orcamentosService: OrcamentosService) {}

  @Post()
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um orcamento e calcula seus totais' })
  create(@Body() dto: CreateOrcamentoDto) {
    return this.orcamentosService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista orcamentos com indicadores e filtros' })
  findAll(@Query() query: ListOrcamentosQueryDto) {
    return this.orcamentosService.findAll(query);
  }

  @Get('opcoes/materiais')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista materiais ativos para compor orcamentos' })
  findMateriaisAtivos() {
    return this.orcamentosService.findMateriaisAtivos();
  }

  @Get('opcoes/servicos')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista servicos ativos para compor orcamentos' })
  findServicosAtivos() {
    return this.orcamentosService.findServicosAtivos();
  }

  @Get(':id')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza um orcamento completo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orcamentosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Edita um orcamento ainda nao aprovado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrcamentoDto,
  ) {
    return this.orcamentosService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Atualiza o status de analise do orcamento' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusOrcamentoDto,
  ) {
    return this.orcamentosService.updateStatus(id, dto);
  }

  @Patch(':id/aprovar')
  @RequirePermission({ modulo: 'ORCAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Aprova o orcamento e o converte em projeto' })
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AprovarOrcamentoDto,
  ) {
    return this.orcamentosService.aprovar(id, dto);
  }
}
