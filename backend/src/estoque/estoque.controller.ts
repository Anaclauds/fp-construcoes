import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { AjustarEstoqueDto } from './dto/ajustar-estoque.dto';
import { CreateMaterialEstoqueDto } from './dto/create-material-estoque.dto';
import { ListEstoqueQueryDto } from './dto/list-estoque-query.dto';
import { EstoqueService } from './estoque.service';

@ApiTags('Estoque')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get()
  @RequirePermission({ modulo: 'ESTOQUE', acao: 'visualizar' })
  @ApiOperation({
    summary: 'Gerencia saldos, reservas e indicadores do estoque',
  })
  findAll(@Query() query: ListEstoqueQueryDto) {
    return this.estoqueService.findAll(query);
  }

  @Post('materiais')
  @RequirePermission({ modulo: 'ESTOQUE', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um novo material com quantidade inicial' })
  createMaterial(
    @Body() dto: CreateMaterialEstoqueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.estoqueService.createMaterial(dto, user.sub);
  }

  @Get(':materialId')
  @RequirePermission({ modulo: 'ESTOQUE', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza saldo, projetos e ultimas compras' })
  findOne(@Param('materialId', ParseIntPipe) materialId: number) {
    return this.estoqueService.findOne(materialId);
  }

  @Post(':materialId/ajustes')
  @RequirePermission({ modulo: 'ESTOQUE', acao: 'gerenciar' })
  @ApiOperation({
    summary: 'Registra entrada ou saida manual com justificativa',
  })
  ajustar(
    @Param('materialId', ParseIntPipe) materialId: number,
    @Body() dto: AjustarEstoqueDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.estoqueService.ajustar(materialId, dto, user.sub);
  }
}
