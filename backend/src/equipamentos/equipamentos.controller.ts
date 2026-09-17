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
import { CreateEquipamentoDto } from './dto/create-equipamento.dto';
import { ListEquipamentosQueryDto } from './dto/list-equipamentos-query.dto';
import { UpdateEquipamentoDto } from './dto/update-equipamento.dto';
import { EquipamentosService } from './equipamentos.service';

@ApiTags('Equipamentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('equipamentos')
export class EquipamentosController {
  constructor(private readonly equipamentosService: EquipamentosService) {}

  @Post()
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Cadastra um equipamento e gera o codigo patrimonial',
  })
  create(@Body() dto: CreateEquipamentoDto) {
    return this.equipamentosService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista equipamentos com busca e filtros' })
  findAll(@Query() query: ListEquipamentosQueryDto) {
    return this.equipamentosService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza um equipamento' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equipamentosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Edita um equipamento' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEquipamentoDto,
  ) {
    return this.equipamentosService.update(id, dto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um equipamento sem apagar o historico' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.equipamentosService.updateStatus(id, StatusCadastro.INATIVO);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'EQUIPAMENTOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um equipamento' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.equipamentosService.updateStatus(id, StatusCadastro.ATIVO);
  }
}
