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
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMateriaisQueryDto } from './dto/list-materiais-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { MateriaisService } from './materiais.service';

@ApiTags('Materiais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('materiais')
export class MateriaisController {
  constructor(private readonly materiaisService: MateriaisService) {}

  @Post()
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um material e gera o codigo automatico' })
  create(@Body() dto: CreateMaterialDto) {
    return this.materiaisService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista o catalogo de materiais' })
  findAll(@Query() query: ListMateriaisQueryDto) {
    return this.materiaisService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza os dados de um material' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materiaisService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Edita os dados de um material' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.materiaisService.update(id, dto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um material sem apagar o historico' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.materiaisService.updateStatus(id, StatusCadastro.INATIVO);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'MATERIAIS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um material' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.materiaisService.updateStatus(id, StatusCadastro.ATIVO);
  }
}
