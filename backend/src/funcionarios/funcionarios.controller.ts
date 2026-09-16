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
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { ListFuncionariosQueryDto } from './dto/list-funcionarios-query.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import { FuncionariosService } from './funcionarios.service';

@ApiTags('Funcionarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('funcionarios')
export class FuncionariosController {
  constructor(private readonly funcionariosService: FuncionariosService) {}

  @Post()
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um funcionario' })
  create(@Body() createFuncionarioDto: CreateFuncionarioDto) {
    return this.funcionariosService.create(createFuncionarioDto);
  }

  @Get()
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista funcionarios' })
  findAll(@Query() query: ListFuncionariosQueryDto) {
    return this.funcionariosService.findAll(query);
  }

  @Get(':id')
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Busca um funcionario pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.funcionariosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Atualiza um funcionario' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateFuncionarioDto: UpdateFuncionarioDto,
  ) {
    return this.funcionariosService.update(id, updateFuncionarioDto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um funcionario' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.funcionariosService.desativar(id);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'GESTAO_FUNCIONARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um funcionario' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.funcionariosService.reativar(id);
  }
}
