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
import { MODULOS_SISTEMA_OPCOES } from '../auth/permissions.constants';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ListUsuariosQueryDto } from './dto/list-usuarios-query.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosService } from './usuarios.service';

@ApiTags('Usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um usuario' })
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista usuarios' })
  findAll(@Query() query: ListUsuariosQueryDto) {
    return this.usuariosService.findAll(query);
  }

  @Get('opcoes/modulos')
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista os modulos disponiveis para permissao' })
  listarModulos() {
    return MODULOS_SISTEMA_OPCOES;
  }

  @Get(':id')
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'visualizar' })
  @ApiOperation({ summary: 'Busca um usuario pelo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Atualiza um usuario' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um usuario' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.desativar(id);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'GESTAO_USUARIOS', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um usuario' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.reativar(id);
  }
}
