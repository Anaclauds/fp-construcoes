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
import { DespesasService } from './despesas.service';
import { CreateDespesaDto } from './dto/create-despesa.dto';
import { ListDespesasQueryDto } from './dto/list-despesas-query.dto';
import { UpdateDespesaDto } from './dto/update-despesa.dto';
import { ListMateriaisQueryDto } from '../materiais/dto/list-materiais-query.dto';
import { CancelarDto } from '../common/dto/cancelar.dto';

@ApiTags('Despesas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('despesas')
export class DespesasController {
  constructor(private readonly despesasService: DespesasService) {}

  @Post()
  @RequirePermission({ modulo: 'DESPESAS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Cadastra despesa e atualiza caixa e estoque automaticamente',
  })
  create(@Body() dto: CreateDespesaDto, @CurrentUser() user: AuthUser) {
    return this.despesasService.create(dto, user.sub);
  }

  @Get()
  @RequirePermission({ modulo: 'DESPESAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista despesas com indicadores, busca e filtros' })
  findAll(@Query() query: ListDespesasQueryDto) {
    return this.despesasService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza os dados completos de uma despesa' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.despesasService.findOne(id);
  }

  @Get('opcoes/materiais')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'visualizar' })
  @ApiOperation({
    summary:
      'Lista materiais ativos para compra, sem acesso ao catalogo completo',
  })
  opcoesMateriais(@Query() query: ListMateriaisQueryDto) {
    return this.despesasService.opcoesMateriais(query);
  }

  @Patch(':id/cancelar')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'gerenciar' })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelarDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.despesasService.cancelar(id, user.sub, dto.motivo);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'DESPESAS', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Edita despesa e reconcilia caixa e estoque automaticamente',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDespesaDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.despesasService.update(id, dto, user.sub);
  }
}
