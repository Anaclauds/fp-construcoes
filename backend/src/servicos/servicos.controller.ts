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
import { StatusCadastro } from '@prisma/client';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateServicoDto } from './dto/create-servico.dto';
import { ListServicosQueryDto } from './dto/list-servicos-query.dto';
import { UpdateServicoDto } from './dto/update-servico.dto';
import { ServicosService } from './servicos.service';

@ApiTags('Servicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Post()
  @RequirePermission({ modulo: 'SERVICOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um servico' })
  create(@Body() dto: CreateServicoDto) {
    return this.servicosService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'SERVICOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista servicos com busca e filtros' })
  findAll(@Query() query: ListServicosQueryDto) {
    return this.servicosService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'SERVICOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza um servico' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.servicosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'SERVICOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Edita um servico' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateServicoDto) {
    return this.servicosService.update(id, dto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'SERVICOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um servico sem apagar o historico' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.servicosService.updateStatus(id, StatusCadastro.INATIVO);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'SERVICOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um servico' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.servicosService.updateStatus(id, StatusCadastro.ATIVO);
  }
}
