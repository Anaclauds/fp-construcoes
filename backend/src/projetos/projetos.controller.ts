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
import { CreateEtapaProjetoDto } from './dto/create-etapa-projeto.dto';
import { CreateExtraProjetoDto } from './dto/create-extra-projeto.dto';
import { IniciarProjetoDto } from './dto/iniciar-projeto.dto';
import { ListProjetosQueryDto } from './dto/list-projetos-query.dto';
import { UpdateStatusProjetoDto } from './dto/update-status-projeto.dto';
import { ProjetosService } from './projetos.service';

@ApiTags('Projetos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Get()
  @RequirePermission({ modulo: 'PROJETOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista projetos com indicadores, busca e filtros' })
  findAll(@Query() query: ListProjetosQueryDto) {
    return this.projetosService.findAll(query);
  }

  @Get('opcoes/materiais')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista materiais ativos para registros extras' })
  findMateriaisAtivos() {
    return this.projetosService.findMateriaisAtivos();
  }

  @Get('opcoes/servicos')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista servicos ativos para etapas e extras' })
  findServicosAtivos() {
    return this.projetosService.findServicosAtivos();
  }

  @Get(':id')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'visualizar' })
  @ApiOperation({
    summary: 'Visualiza projeto, orcamento e execucao completos',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projetosService.findOne(id);
  }

  @Get(':id/historico')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista o historico cronologico de etapas e extras' })
  findHistorico(@Param('id', ParseIntPipe) id: number) {
    return this.projetosService.findHistorico(id);
  }

  @Patch(':id/iniciar')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Inicia o projeto e gera a cobranca aplicavel' })
  iniciar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IniciarProjetoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projetosService.iniciar(id, dto, user.sub);
  }

  @Patch(':id/status')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Conclui ou cancela um projeto em execucao' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusProjetoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projetosService.updateStatus(id, dto, user.sub);
  }

  @Post(':id/etapas')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Registra uma etapa de construcao civil e sua medicao',
  })
  createEtapa(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEtapaProjetoDto,
  ) {
    return this.projetosService.createEtapa(id, dto);
  }

  @Post(':id/extras')
  @RequirePermission({ modulo: 'PROJETOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Registra materiais ou servicos extras do projeto' })
  createExtra(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateExtraProjetoDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projetosService.createExtra(id, dto, user.sub);
  }
}
