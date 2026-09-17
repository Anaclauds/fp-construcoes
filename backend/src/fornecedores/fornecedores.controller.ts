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
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { ListFornecedoresQueryDto } from './dto/list-fornecedores-query.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@ApiTags('Fornecedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Post()
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Cadastra um fornecedor' })
  create(@Body() dto: CreateFornecedorDto) {
    return this.fornecedoresService.create(dto);
  }

  @Get()
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'visualizar' })
  @ApiOperation({ summary: 'Lista fornecedores com busca e paginacao' })
  findAll(@Query() query: ListFornecedoresQueryDto) {
    return this.fornecedoresService.findAll(query);
  }

  @Get('opcoes/ativos')
  @RequirePermission(
    { modulo: 'FORNECEDORES', acao: 'visualizar' },
    { modulo: 'EQUIPAMENTOS', acao: 'visualizar' },
    { modulo: 'MATERIAIS', acao: 'visualizar' },
    { modulo: 'ESTOQUE', acao: 'visualizar' },
  )
  @ApiOperation({ summary: 'Lista fornecedores ativos para campos de selecao' })
  findAtivos() {
    return this.fornecedoresService.findAtivos();
  }

  @Get(':id')
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'visualizar' })
  @ApiOperation({ summary: 'Visualiza um fornecedor e seus vinculos' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fornecedoresService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Edita um fornecedor' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFornecedorDto,
  ) {
    return this.fornecedoresService.update(id, dto);
  }

  @Patch(':id/desativar')
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Desativa um fornecedor sem apagar o historico' })
  desativar(@Param('id', ParseIntPipe) id: number) {
    return this.fornecedoresService.updateStatus(id, StatusCadastro.INATIVO);
  }

  @Patch(':id/reativar')
  @RequirePermission({ modulo: 'FORNECEDORES', acao: 'gerenciar' })
  @ApiOperation({ summary: 'Reativa um fornecedor' })
  reativar(@Param('id', ParseIntPipe) id: number) {
    return this.fornecedoresService.updateStatus(id, StatusCadastro.ATIVO);
  }
}
